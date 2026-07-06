"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Tags } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { useApp } from "@/lib/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">{categories.length} categories</p>
        {can("inventory", "add") && (
          <Button size="sm" className="h-8 text-xs gap-1.5" onClick={openAdd}>
            <Plus className="w-3.5 h-3.5" />
            Add Category
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {categories.length === 0 ? (
          <div className="col-span-full bg-white border border-gray-200 rounded-xl px-4 py-12 text-center text-gray-400">
            <Tags className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No categories yet
          </div>
        ) : (
          categories.map((c) => (
            <div key={c._id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-start justify-between gap-3 hover:shadow-sm transition-shadow">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                  <Tags className="w-4 h-4 text-purple-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{c.name}</p>
                  {c.description && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{c.description}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
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
            </div>
          ))
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogTitle>{editing ? "Edit Category" : "Add Category"}</DialogTitle>
          <div className="space-y-3 py-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Category Name *</label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Surgical Supplies"
                className="h-8 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Optional"
                className="h-8 text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : editing ? "Update" : "Add Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
