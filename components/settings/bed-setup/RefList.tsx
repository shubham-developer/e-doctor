"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useApiQuery } from "@/lib/useApiQuery";
import { apiClient } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import type { RefItem } from "./types";

/** Simple reference list (used for Bed Type, Floor). */
export function RefList({ title, apiPath }: { title: string; apiPath: string }) {
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const {
    data: itemsData,
    isPending: loading,
    refetch: load,
  } = useApiQuery<{ items: RefItem[] }>(["ref-list", apiPath], apiPath);
  const items = itemsData?.items ?? [];

  async function handleAdd() {
    if (!newName.trim()) return;
    setAdding(true);
    const data = await apiClient.post(apiPath, { name: newName.trim() });
    if (data.success) {
      toast.success(`${title} added`);
      setNewName("");
      load();
    } else toast.error(data.error);
    setAdding(false);
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"?`)) return;
    const data = await apiClient.delete(`${apiPath}/${id}`);
    if (data.success) {
      toast.success("Deleted");
      load();
    } else toast.error(data.error);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-4 border-b border-gray-100 shrink-0">
        <Input
          className="h-9 text-sm flex-1"
          placeholder={`Add ${title}…`}
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

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-xs text-gray-400">
            Loading…
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <p className="text-xs">No {title.toLowerCase()}s configured yet</p>
            <p className="text-xs mt-1">Add one above to get started</p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">
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
    </div>
  );
}
