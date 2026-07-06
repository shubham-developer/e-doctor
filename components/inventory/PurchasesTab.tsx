"use client";

import { useState } from "react";
import { useApiQuery } from "@/lib/useApiQuery";
import { toast } from "sonner";
import { Plus, ShoppingCart, X } from "lucide-react";
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
import type {
  InventoryPurchase,
  InventoryItem,
  InventoryVendor,
} from "./types";

interface Props {
  vendors: InventoryVendor[];
  items: InventoryItem[];
}

interface LineItem {
  itemId: string;
  itemName: string;
  quantity: string;
  unitCost: string;
  totalCost: number;
}

export function PurchasesTab({ vendors, items }: Props) {
  const { can } = useApp();
  const { fmt: format } = useCurrency();

  const [page, setPage] = useState(1);
  const LIMIT = 20;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    vendorId: "",
    vendorName: "",
    invoiceNumber: "",
    purchaseDate: new Date().toISOString().slice(0, 10),
    notes: "",
  });
  const [lines, setLines] = useState<LineItem[]>([
    { itemId: "", itemName: "", quantity: "", unitCost: "", totalCost: 0 },
  ]);

  const {
    data: purchasesData,
    isPending: loading,
    refetch: load,
  } = useApiQuery<{ purchases: InventoryPurchase[]; total: number }>(
    ["inventory-purchases", page],
    `/api/dashboard/inventory/purchases?page=${page}&limit=${LIMIT}`,
    { keepPrevious: true },
  );
  const purchases = purchasesData?.purchases ?? [];
  const total = purchasesData?.total ?? 0;

  function openAdd() {
    setForm({
      vendorId: "",
      vendorName: "",
      invoiceNumber: "",
      purchaseDate: new Date().toISOString().slice(0, 10),
      notes: "",
    });
    setLines([
      { itemId: "", itemName: "", quantity: "", unitCost: "", totalCost: 0 },
    ]);
    setDialogOpen(true);
  }

  function updateLine(idx: number, field: keyof LineItem, value: string) {
    setLines((prev) => {
      const next = [...prev];
      const line = { ...next[idx], [field]: value };

      if (field === "itemId") {
        const found = items.find((i) => i._id === value);
        line.itemName = found?.name ?? "";
        line.unitCost = found ? String(found.unitCost) : "";
      }

      if (field === "quantity" || field === "unitCost") {
        const qty =
          parseFloat(field === "quantity" ? value : line.quantity) || 0;
        const uc =
          parseFloat(field === "unitCost" ? value : line.unitCost) || 0;
        line.totalCost = qty * uc;
      }

      next[idx] = line;
      return next;
    });
  }

  function addLine() {
    setLines((p) => [
      ...p,
      { itemId: "", itemName: "", quantity: "", unitCost: "", totalCost: 0 },
    ]);
  }

  function removeLine(idx: number) {
    setLines((p) => p.filter((_, i) => i !== idx));
  }

  const grandTotal = lines.reduce((s, l) => s + l.totalCost, 0);

  async function handleSave() {
    const validLines = lines.filter((l) => l.itemId && Number(l.quantity) > 0);
    if (validLines.length === 0)
      return toast.error("Add at least one item with quantity");
    if (!form.purchaseDate) return toast.error("Purchase date is required");

    setSaving(true);
    const res = await apiClient.post("/api/dashboard/inventory/purchases", {
      ...form,
      vendorName: form.vendorId
        ? (vendors.find((v) => v._id === form.vendorId)?.name ??
          form.vendorName)
        : form.vendorName,
      items: validLines.map((l) => ({
        itemId: l.itemId,
        itemName: l.itemName,
        quantity: Number(l.quantity),
        unitCost: Number(l.unitCost),
        totalCost: l.totalCost,
      })),
    });
    setSaving(false);

    if (res.success) {
      toast.success("Purchase recorded & stock updated");
      setDialogOpen(false);
      load();
    } else {
      toast.error(res.error ?? "Failed to save");
    }
  }

  const columns: ColumnDef<InventoryPurchase>[] = [
    {
      key: "purchaseDate",
      header: "Date",
      render: (p) => (
        <span className="text-gray-700">
          {new Date(p.purchaseDate).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
      ),
    },
    {
      key: "vendor",
      header: "Vendor",
      render: (p) => (
        <span className="font-medium text-gray-800">
          {typeof p.vendorId === "object"
            ? p.vendorId.name
            : p.vendorName || "—"}
        </span>
      ),
    },
    {
      key: "invoiceNumber",
      header: "Invoice #",
      render: (p) => (
        <span className="text-gray-500">{p.invoiceNumber || "—"}</span>
      ),
    },
    {
      key: "items",
      header: "Items",
      align: "right",
      render: (p) => <span className="text-gray-700">{p.items.length}</span>,
    },
    {
      key: "totalAmount",
      header: "Total Amount",
      align: "right",
      render: (p) => (
        <span className="font-semibold text-gray-900">
          {format(p.totalAmount)}
        </span>
      ),
    },
    {
      key: "createdBy",
      header: "Created By",
      render: (p) => (
        <span className="text-gray-500">{p.createdBy || "—"}</span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">{total} purchase records</p>
        {can("inventory", "add") && (
          <Button size="sm" className="h-8 text-xs gap-1.5" onClick={openAdd}>
            <Plus className="w-3.5 h-3.5" />
            New Purchase (Stock In)
          </Button>
        )}
      </div>

      <DataTable<InventoryPurchase>
        columns={columns}
        data={purchases}
        rowKey={(p) => p._id}
        loading={loading}
        emptyNode={
          <div>
            <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No purchases recorded yet
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
        itemLabel="purchase records"
      />

      {/* Add Purchase Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogTitle>New Purchase Order (Stock In)</DialogTitle>
          <div className="space-y-4 py-2">
            {/* Header fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Vendor
                </label>
                <Select
                  value={form.vendorId}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      vendorId: v ?? "",
                      vendorName: "",
                    }))
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select vendor (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No vendor</SelectItem>
                    {vendors.map((v) => (
                      <SelectItem key={v._id} value={v._id}>
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!form.vendorId && (
                  <Input
                    value={form.vendorName}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, vendorName: e.target.value }))
                    }
                    placeholder="Or type vendor name"
                    className="h-8 text-xs mt-1.5"
                  />
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Invoice Number
                </label>
                <Input
                  value={form.invoiceNumber}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, invoiceNumber: e.target.value }))
                  }
                  placeholder="Optional"
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Purchase Date *
                </label>
                <Input
                  type="date"
                  value={form.purchaseDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, purchaseDate: e.target.value }))
                  }
                  className="h-8 text-xs"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <Input
                  value={form.notes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  placeholder="Optional"
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* Line items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-700">Items</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={addLine}
                >
                  <Plus className="w-3 h-3" /> Add Row
                </Button>
              </div>
              <div className="border border-gray-200 rounded-lg overflow-x-auto">
                <table
                  className="text-xs"
                  style={{ minWidth: "480px", width: "100%" }}
                >
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-3 py-2 font-semibold text-gray-600">
                        Item
                      </th>
                      <th className="text-right px-3 py-2 font-semibold text-gray-600 w-20">
                        Qty
                      </th>
                      <th className="text-right px-3 py-2 font-semibold text-gray-600 w-28">
                        Unit Cost
                      </th>
                      <th className="text-right px-3 py-2 font-semibold text-gray-600 w-24">
                        Total
                      </th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {lines.map((line, idx) => (
                      <tr key={idx}>
                        <td className="px-2 py-1.5">
                          <Select
                            value={line.itemId}
                            onValueChange={(v) =>
                              updateLine(idx, "itemId", v ?? "")
                            }
                          >
                            <SelectTrigger className="h-7 text-xs w-full">
                              <SelectValue placeholder="Select item" />
                            </SelectTrigger>
                            <SelectContent>
                              {items.map((it) => (
                                <SelectItem key={it._id} value={it._id}>
                                  {it.name} ({it.unit})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            type="number"
                            min="1"
                            value={line.quantity}
                            onChange={(e) =>
                              updateLine(idx, "quantity", e.target.value)
                            }
                            placeholder="0"
                            className="h-7 text-xs text-right w-full"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.unitCost}
                            onChange={(e) =>
                              updateLine(idx, "unitCost", e.target.value)
                            }
                            placeholder="0.00"
                            className="h-7 text-xs text-right w-full"
                          />
                        </td>
                        <td className="px-3 py-1.5 text-right font-semibold text-gray-700 whitespace-nowrap">
                          {format(line.totalCost)}
                        </td>
                        <td className="px-1 py-1.5 text-center">
                          {lines.length > 1 && (
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => removeLine(idx)}
                              className="text-gray-300 hover:text-red-500 hover:bg-red-50"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-gray-200 bg-gray-50">
                      <td
                        colSpan={3}
                        className="px-3 py-2 text-right font-semibold text-gray-700 text-xs"
                      >
                        Grand Total
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-gray-900 text-sm whitespace-nowrap">
                        {format(grandTotal)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
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
              {saving ? "Saving…" : "Record Purchase & Update Stock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
