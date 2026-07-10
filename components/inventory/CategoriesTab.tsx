"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Tags } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { useApp } from "@/lib/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormDialog } from "@/components/common/FormDialog";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import type { InventoryCategory } from "./types";

interface Props {
  categories: InventoryCategory[];
  onRefresh: () => void;
}

export function CategoriesTab({ categories, onRefresh }: Props) {
  const { can } = useApp();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryCategory | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });

  function openAdd() { setEditing(null); setForm({ name: "", description: "" }); setDialogOpen(true); }
  function openEdit(c: InventoryCategory) {
    setEditing(c);
    setForm({ name: c.name, description: c.description });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) return toast.error("Name is required");
    setSaving(true);
    const res = editing
      ? await apiClient.put(`/api/dashboard/inventory/categories/${editing._id}`, form)
      : await apiClient.post("/api/dashboard/inventory/categories", form);
    setSaving(false);
    if (res.success) {
      toast.success(editing ? "Category updated" : "Category added");
      setDialogOpen(false);
      onRefresh();
    } else {
      toast.error(res.error ?? "Failed to save");
    }
  }

  async function handleDelete(c: InventoryCategory) {
    if (!confirm(`Delete category "${c.name}"?`)) return;
    const res = await apiClient.delete(`/api/dashboard/inventory/categories/${c._id}`);
    if (res.success) { toast.success("Deleted"); onRefresh(); }
    else toast.error(res.error ?? "Failed to delete");
  }

  const columns: ColumnDef<InventoryCategory>[] = [
    {
      key: "name",
      header: "Category Name",
      sortable: true,
      sortValue: (c) => c.name,
      render: (c) => (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-purple-100 flex items-center justify-center shrink-0">
            <Tags className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <span className="text-xs font-medium text-gray-800">{c.name}</span>
        </div>
      ),
    },
    {
      key: "description",
      header: "Description",
      render: (c) => (
        <span className="text-xs text-gray-500">{c.description || "—"}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      width: "w-20",
      align: "right",
      render: (c) => (
        <div className="flex items-center justify-end gap-1">
          {can("inventory", "edit") && (
            <Button variant="ghost" size="icon-sm" onClick={() => openEdit(c)} className="text-gray-400 hover:text-blue-600 hover:bg-blue-50">
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          )}
          {can("inventory", "delete") && (
            <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(c)} className="text-gray-400 hover:text-red-600 hover:bg-red-50">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable<InventoryCategory>
        columns={columns}
        data={categories}
        rowKey={(c) => c._id}
        emptyNode={
          <div>
            <Tags className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No categories yet
          </div>
        }
        toolbarRight={
          can("inventory", "add") ? (
            <Button size="sm" className="h-8 text-xs gap-1.5" onClick={openAdd}>
              <Plus className="w-3.5 h-3.5" />
              Add Category
            </Button>
          ) : (
            <span className="text-xs text-gray-400">{categories.length} categories</span>
          )
        }
        wrapperClassName="rounded-xl"
        className="text-xs"
      />

      <FormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? "Edit Category" : "Add Category"}
        contentClassName="sm:w-[min(92vw,420px)]"
        footer={
          <>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="bg-primary-600 hover:bg-primary-700" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : editing ? "Update" : "Add Category"}
            </Button>
          </>
        }
      >
        <div className="px-5 py-4 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-500">Category Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Surgical Supplies"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-500">Description</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Optional"
            />
          </div>
        </div>
      </FormDialog>
    </>
  );
}
