"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, AlertTriangle, Search, Package } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { useApp } from "@/lib/context";
import { useCurrency } from "@/lib/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { InventoryItem, InventoryCategory } from "./types";

interface Props {
  categories: InventoryCategory[];
}

export function ItemsTab({ categories }: Props) {
  const { can } = useApp();
  const { fmt: format } = useCurrency();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    categoryId: "",
    unit: "Pcs",
    currentStock: "",
    reorderLevel: "",
    maxStock: "",
    unitCost: "",
    location: "",
    description: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(LIMIT),
      ...(search && { search }),
      ...(categoryFilter !== "all" && { categoryId: categoryFilter }),
      ...(lowStockOnly && { lowStock: "true" }),
    });
    const res = await apiClient.get<{ items: InventoryItem[]; total: number }>(
      `/api/dashboard/inventory/items?${params}`
    );
    setLoading(false);
    if (res.success) {
      setItems(res.data?.items ?? []);
      setTotal(res.data?.total ?? 0);
    } else {
      toast.error(res.error ?? "Failed to load items");
    }
  }, [page, search, categoryFilter, lowStockOnly]);

  useEffect(() => { load(); }, [load]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  function openAdd() {
    setEditing(null);
    setForm({ name: "", categoryId: "", unit: "Pcs", currentStock: "", reorderLevel: "", maxStock: "", unitCost: "", location: "", description: "" });
    setDialogOpen(true);
  }

  function openEdit(item: InventoryItem) {
    setEditing(item);
    setForm({
      name: item.name,
      categoryId: typeof item.categoryId === "object" ? item.categoryId._id : item.categoryId,
      unit: item.unit,
      currentStock: String(item.currentStock),
      reorderLevel: String(item.reorderLevel),
      maxStock: String(item.maxStock),
      unitCost: String(item.unitCost),
      location: item.location,
      description: item.description,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) return toast.error("Name is required");
    if (!form.categoryId) return toast.error("Category is required");
    setSaving(true);
    const payload = {
      ...form,
      currentStock: Number(form.currentStock || 0),
      reorderLevel: Number(form.reorderLevel || 0),
      maxStock: Number(form.maxStock || 0),
      unitCost: Number(form.unitCost || 0),
    };
    const res = editing
      ? await apiClient.put(`/api/dashboard/inventory/items/${editing._id}`, payload)
      : await apiClient.post("/api/dashboard/inventory/items", payload);
    setSaving(false);
    if (res.success) {
      toast.success(editing ? "Item updated" : "Item added");
      setDialogOpen(false);
      load();
    } else {
      toast.error(res.error ?? "Failed to save");
    }
  }

  async function handleDelete(item: InventoryItem) {
    if (!confirm(`Delete "${item.name}"?`)) return;
    const res = await apiClient.delete(`/api/dashboard/inventory/items/${item._id}`);
    if (res.success) { toast.success("Deleted"); load(); }
    else toast.error(res.error ?? "Failed to delete");
  }

  const catName = (item: InventoryItem) =>
    typeof item.categoryId === "object" ? item.categoryId.name : "—";

  const stockStatus = (item: InventoryItem) => {
    if (item.currentStock === 0) return { label: "Out", cls: "bg-red-100 text-red-700" };
    if (item.currentStock <= item.reorderLevel) return { label: "Low", cls: "bg-amber-100 text-amber-700" };
    return { label: "OK", cls: "bg-green-100 text-green-700" };
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search items…"
            className="pl-8 h-8 text-xs"
          />
        </div>
        <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v ?? "all"); setPage(1); }}>
          <SelectTrigger className="h-8 text-xs w-36">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={lowStockOnly ? "default" : "outline"}
          size="sm"
          className="h-8 text-xs gap-1.5"
          onClick={() => { setLowStockOnly((v) => !v); setPage(1); }}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Low Stock Only
        </Button>
        <div className="ml-auto">
          {can("inventory", "add") && (
            <Button size="sm" className="h-8 text-xs gap-1.5" onClick={openAdd}>
              <Plus className="w-3.5 h-3.5" />
              Add Item
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Item</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Category</th>
                <th className="text-right px-4 py-2.5 font-semibold text-gray-600">Stock</th>
                <th className="text-right px-4 py-2.5 font-semibold text-gray-600">Reorder Level</th>
                <th className="text-right px-4 py-2.5 font-semibold text-gray-600">Unit Cost</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Location</th>
                <th className="text-center px-4 py-2.5 font-semibold text-gray-600">Status</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No items found
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const status = stockStatus(item);
                  return (
                    <tr key={item._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {item.name}
                        <span className="ml-1.5 text-gray-400 font-normal">({item.unit})</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{catName(item)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-800">
                        {item.currentStock}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">{item.reorderLevel}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{format(item.unitCost)}</td>
                      <td className="px-4 py-3 text-gray-500">{item.location || "—"}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-2xs font-semibold ${status.cls}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          {can("inventory", "edit") && (
                            <button
                              onClick={() => openEdit(item)}
                              className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {can("inventory", "delete") && (
                            <button
                              onClick={() => handleDelete(item)}
                              className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>{total} items total</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Prev
              </Button>
              <span>{page} / {totalPages}</span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogTitle>{editing ? "Edit Item" : "Add Inventory Item"}</DialogTitle>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Item Name *</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Surgical Gloves"
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Category *</label>
                <Select value={form.categoryId} onValueChange={(v) => setForm((f) => ({ ...f, categoryId: v ?? "" }))}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Unit</label>
                <Select value={form.unit} onValueChange={(v) => setForm((f) => ({ ...f, unit: v ?? "Pcs" }))}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Pcs", "Box", "Pack", "Bottle", "Strip", "Kg", "Ltr", "Mtr", "Roll", "Set", "Pair", "Dozen"].map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {!editing && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Opening Stock</label>
                  <Input
                    type="number"
                    min="0"
                    value={form.currentStock}
                    onChange={(e) => setForm((f) => ({ ...f, currentStock: e.target.value }))}
                    placeholder="0"
                    className="h-8 text-xs"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Reorder Level</label>
                <Input
                  type="number"
                  min="0"
                  value={form.reorderLevel}
                  onChange={(e) => setForm((f) => ({ ...f, reorderLevel: e.target.value }))}
                  placeholder="0"
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Max Stock</label>
                <Input
                  type="number"
                  min="0"
                  value={form.maxStock}
                  onChange={(e) => setForm((f) => ({ ...f, maxStock: e.target.value }))}
                  placeholder="0"
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Unit Cost (₹)</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.unitCost}
                  onChange={(e) => setForm((f) => ({ ...f, unitCost: e.target.value }))}
                  placeholder="0.00"
                  className="h-8 text-xs"
                />
              </div>
              <div className={editing ? "col-span-2" : ""}>
                <label className="block text-xs font-medium text-gray-700 mb-1">Storage Location</label>
                <Input
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  placeholder="e.g. Ward A Storeroom"
                  className="h-8 text-xs"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Optional notes"
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : editing ? "Update" : "Add Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
