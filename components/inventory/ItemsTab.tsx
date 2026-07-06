"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useApiQuery } from "@/lib/useApiQuery";
import {
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  Search,
  Package,
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { useApp } from "@/lib/context";
import { useCurrency } from "@/lib/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { TablePagination } from "@/components/common/TablePagination";
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

  const itemsParams = new URLSearchParams({
    page: String(page),
    limit: String(LIMIT),
    ...(search && { search }),
    ...(categoryFilter !== "all" && { categoryId: categoryFilter }),
    ...(lowStockOnly && { lowStock: "true" }),
  });
  const {
    data: itemsData,
    isPending: loading,
    refetch: load,
  } = useApiQuery<{ items: InventoryItem[]; total: number }>(
    ["inventory-items", page, search, categoryFilter, lowStockOnly],
    `/api/dashboard/inventory/items?${itemsParams}`,
    { keepPrevious: true },
  );
  const items = itemsData?.items ?? [];
  const total = itemsData?.total ?? 0;

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  function openAdd() {
    setEditing(null);
    setForm({
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
    setDialogOpen(true);
  }

  function openEdit(item: InventoryItem) {
    setEditing(item);
    setForm({
      name: item.name,
      categoryId:
        typeof item.categoryId === "object"
          ? item.categoryId._id
          : item.categoryId,
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
      ? await apiClient.put(
          `/api/dashboard/inventory/items/${editing._id}`,
          payload,
        )
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
    const res = await apiClient.delete(
      `/api/dashboard/inventory/items/${item._id}`,
    );
    if (res.success) {
      toast.success("Deleted");
      load();
    } else toast.error(res.error ?? "Failed to delete");
  }

  const catName = (item: InventoryItem) =>
    typeof item.categoryId === "object" ? item.categoryId.name : "—";

  const stockStatus = (item: InventoryItem) => {
    if (item.currentStock === 0)
      return { label: "Out", cls: "bg-red-100 text-red-700" };
    if (item.currentStock <= item.reorderLevel)
      return { label: "Low", cls: "bg-amber-100 text-amber-700" };
    return { label: "OK", cls: "bg-green-100 text-green-700" };
  };

  const columns: ColumnDef<InventoryItem>[] = [
    {
      key: "name",
      header: "Item",
      render: (item) => (
        <span className="font-medium text-gray-800">
          {item.name}
          <span className="ml-1.5 text-gray-400 font-normal">
            ({item.unit})
          </span>
        </span>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (item) => <span className="text-gray-600">{catName(item)}</span>,
    },
    {
      key: "currentStock",
      header: "Stock",
      align: "right",
      render: (item) => (
        <span className="font-semibold text-gray-800">
          {item.currentStock}
        </span>
      ),
    },
    {
      key: "reorderLevel",
      header: "Reorder Level",
      align: "right",
      render: (item) => (
        <span className="text-gray-600">{item.reorderLevel}</span>
      ),
    },
    {
      key: "unitCost",
      header: "Unit Cost",
      align: "right",
      render: (item) => (
        <span className="text-gray-600">{format(item.unitCost)}</span>
      ),
    },
    {
      key: "location",
      header: "Location",
      render: (item) => (
        <span className="text-gray-500">{item.location || "—"}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      render: (item) => {
        const status = stockStatus(item);
        return (
          <span
            className={`inline-block px-2 py-0.5 rounded-full text-2xs font-semibold ${status.cls}`}
          >
            {status.label}
          </span>
        );
      },
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (item) => (
        <div className="flex items-center gap-1">
          {can("inventory", "edit") && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => openEdit(item)}
              className="text-gray-400 hover:text-blue-600 hover:bg-blue-50"
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          )}
          {can("inventory", "delete") && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => handleDelete(item)}
              className="text-gray-400 hover:text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      ),
    },
  ];

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
        <Select
          value={categoryFilter}
          onValueChange={(v) => {
            setCategoryFilter(v ?? "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="h-8 text-xs w-36">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c._id} value={c._id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={lowStockOnly ? "default" : "outline"}
          size="sm"
          className="h-8 text-xs gap-1.5"
          onClick={() => {
            setLowStockOnly((v) => !v);
            setPage(1);
          }}
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
      <DataTable<InventoryItem>
        columns={columns}
        data={items}
        rowKey={(item) => item._id}
        loading={loading}
        emptyNode={
          <div>
            <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No items found
          </div>
        }
        wrapperClassName="rounded-xl"
        className="text-xs"
      />
      <TablePagination
        page={page}
        total={total}
        limit={LIMIT}
        onPageChange={setPage}
        itemLabel="items total"
      />

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogTitle>
            {editing ? "Edit Item" : "Add Inventory Item"}
          </DialogTitle>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Item Name *
                </label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="e.g. Surgical Gloves"
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <Select
                  value={form.categoryId}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, categoryId: v ?? "" }))
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c._id} value={c._id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Unit
                </label>
                <Select
                  value={form.unit}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, unit: v ?? "Pcs" }))
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "Pcs",
                      "Box",
                      "Pack",
                      "Bottle",
                      "Strip",
                      "Kg",
                      "Ltr",
                      "Mtr",
                      "Roll",
                      "Set",
                      "Pair",
                      "Dozen",
                    ].map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {!editing && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Opening Stock
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={form.currentStock}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, currentStock: e.target.value }))
                    }
                    placeholder="0"
                    className="h-8 text-xs"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Reorder Level
                </label>
                <Input
                  type="number"
                  min="0"
                  value={form.reorderLevel}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, reorderLevel: e.target.value }))
                  }
                  placeholder="0"
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Max Stock
                </label>
                <Input
                  type="number"
                  min="0"
                  value={form.maxStock}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, maxStock: e.target.value }))
                  }
                  placeholder="0"
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Unit Cost (₹)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.unitCost}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, unitCost: e.target.value }))
                  }
                  placeholder="0.00"
                  className="h-8 text-xs"
                />
              </div>
              <div className={editing ? "col-span-2" : ""}>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Storage Location
                </label>
                <Input
                  value={form.location}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, location: e.target.value }))
                  }
                  placeholder="e.g. Ward A Storeroom"
                  className="h-8 text-xs"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Description
                </label>
                <Input
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="Optional notes"
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : editing ? "Update" : "Add Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
