"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useApiQuery } from "@/lib/useApiQuery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";

interface DeptItem {
  _id: string;
  name: string;
}

export function DepartmentSetupTab() {
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const {
    data,
    isPending: loading,
    refetch,
  } = useApiQuery<{ items: DeptItem[] }>(
    ["departments"],
    "/api/dashboard/departments",
  );
  const items = data?.items ?? [];

  async function handleAdd() {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/dashboard/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const d = await res.json();
      if (d.success) {
        toast.success("Department added");
        setNewName("");
        refetch();
      } else {
        toast.error(d.error ?? "Failed to add");
      }
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"?`)) return;
    const res = await fetch(`/api/dashboard/departments/${id}`, {
      method: "DELETE",
    });
    const d = await res.json();
    if (d.success) {
      toast.success("Deleted");
      refetch();
    } else {
      toast.error(d.error ?? "Failed to delete");
    }
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white max-w-lg">
      {/* Add row */}
      <div className="flex items-center gap-2 p-4 border-b border-gray-100">
        <Input
          className="h-9 text-sm flex-1"
          placeholder="Department name…"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <Button
          size="sm"
          className="h-9 bg-primary-600 hover:bg-primary-700 gap-1.5 shrink-0"
          onClick={handleAdd}
          disabled={adding || !newName.trim()}
        >
          <Plus className="w-3.5 h-3.5" /> Add
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-xs text-gray-400">
          Loading…
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <p className="text-xs">No departments yet</p>
          <p className="text-xs mt-1">Add one above to get started</p>
        </div>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-2.5 font-medium text-gray-600">
                Name
              </th>
              <th className="w-16" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map((item) => (
              <tr key={item._id} className="hover:bg-gray-50 group">
                <td className="px-4 py-2.5 text-xs text-gray-800">
                  {item.name}
                </td>
                <td className="px-2 py-2.5 text-right">
                  <button
                    onClick={() => handleDelete(item._id, item.name)}
                    className="p-1.5 rounded hover:bg-danger-50 text-gray-300 hover:text-danger-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
