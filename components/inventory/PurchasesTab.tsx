"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Trash2, ShoppingCart, X } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { useApp } from "@/lib/context";
import { useCurrency } from "@/lib/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import type { InventoryPurchase, InventoryItem, InventoryVendor } from "./types";

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

  const [purchases, setPurchases] = useState<InventoryPurchase[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
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

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiClient.get<{ purchases: InventoryPurchase[]; total: number }>(
      `/api/dashboard/inventory/purchases?page=${page}&limit=${LIMIT}`
    );
    setLoading(false);
    if (res.success) {
      setPurchases(res.data?.purchases ?? []);
      setTotal(res.data?.total ?? 0);
    } else {
      toast.error(res.error ?? "Failed to load purchases");
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setForm({ vendorId: "", vendorName: "", invoiceNumber: "", purchaseDate: new Date().toISOString().slice(0, 10), notes: "" });
    setLines([{ itemId: "", itemName: "", quantity: "", unitCost: "", totalCost: 0 }]);
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
        const qty = parseFloat(field === "quantity" ? value : line.quantity) || 0;
        const uc = parseFloat(field === "unitCost" ? value : line.unitCost) || 0;
        line.totalCost = qty * uc;
      }

      next[idx] = line;
      return next;
    });
  }

  function addLine() {
    setLines((p) => [...p, { itemId: "", itemName: "", quantity: "", unitCost: "", totalCost: 0 }]);
  }

  function removeLine(idx: number) {
    setLines((p) => p.filter((_, i) => i !== idx));
  }

  const grandTotal = lines.reduce((s, l) => s + l.totalCost, 0);

  async function handleSave() {
    const validLines = lines.filter((l) => l.itemId && Number(l.quantity) > 0);
    if (validLines.length === 0) return toast.error("Add at least one item with quantity");
    if (!form.purchaseDate) return toast.error("Purchase date is required");

    setSaving(true);
    const res = await apiClient.post("/api/dashboard/inventory/purchases", {
      ...form,
      vendorName: form.vendorId
        ? (vendors.find((v) => v._id === form.vendorId)?.name ?? form.vendorName)
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

  const totalPages = Math.ceil(total / LIMIT);

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

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Date</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Vendor</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Invoice #</th>
                <th className="text-right px-4 py-2.5 font-semibold text-gray-600">Items</th>
                <th className="text-right px-4 py-2.5 font-semibold text-gray-600">Total Amount</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Created By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : purchases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No purchases recorded yet
                  </td>
                </tr>
              ) : (
                purchases.map((p) => (
                  <tr key={p._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-700">
                      {new Date(p.purchaseDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {typeof p.vendorId === "object" ? p.vendorId.name : p.vendorName || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{p.invoiceNumber || "—"}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{p.items.length}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {format(p.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{p.createdBy || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>{total} records</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
              <span>{page} / {totalPages}</span>
              <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>

      {/* Add Purchase Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogTitle>New Purchase Order (Stock In)</DialogTitle>
          <div className="space-y-4 py-2">
            {/* Header fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Vendor</label>
                <Select value={form.vendorId} onValueChange={(v) => setForm((f) => ({ ...f, vendorId: v ?? "", vendorName: "" }))}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select vendor (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No vendor</SelectItem>
                    {vendors.map((v) => (
                      <SelectItem key={v._id} value={v._id}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!form.vendorId && (
                  <Input
                    value={form.vendorName}
                    onChange={(e) => setForm((f) => ({ ...f, vendorName: e.target.value }))}
                    placeholder="Or type vendor name"
                    className="h-8 text-xs mt-1.5"
                  />
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Invoice Number</label>
                <Input value={form.invoiceNumber} onChange={(e) => setForm((f) => ({ ...f, invoiceNumber: e.target.value }))} placeholder="Optional" className="h-8 text-xs" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Purchase Date *</label>
                <Input type="date" value={form.purchaseDate} onChange={(e) => setForm((f) => ({ ...f, purchaseDate: e.target.value }))} className="h-8 text-xs" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Optional" className="h-8 text-xs" />
              </div>
            </div>

            {/* Line items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-700">Items</p>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addLine}>
                  <Plus className="w-3 h-3" /> Add Row
                </Button>
              </div>
              <div className="border border-gray-200 rounded-lg overflow-x-auto">
                <table className="text-xs" style={{ minWidth: "480px", width: "100%" }}>
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-3 py-2 font-semibold text-gray-600">Item</th>
                      <th className="text-right px-3 py-2 font-semibold text-gray-600 w-20">Qty</th>
                      <th className="text-right px-3 py-2 font-semibold text-gray-600 w-28">Unit Cost</th>
                      <th className="text-right px-3 py-2 font-semibold text-gray-600 w-24">Total</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {lines.map((line, idx) => (
                      <tr key={idx}>
                        <td className="px-2 py-1.5">
                          <Select value={line.itemId} onValueChange={(v) => updateLine(idx, "itemId", v ?? "")}>
                            <SelectTrigger className="h-7 text-xs w-full">
                              <SelectValue placeholder="Select item" />
                            </SelectTrigger>
                            <SelectContent>
                              {items.map((it) => (
                                <SelectItem key={it._id} value={it._id}>{it.name} ({it.unit})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-2 py-1.5">
                          <Input type="number" min="1" value={line.quantity} onChange={(e) => updateLine(idx, "quantity", e.target.value)} placeholder="0" className="h-7 text-xs text-right w-full" />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input type="number" min="0" step="0.01" value={line.unitCost} onChange={(e) => updateLine(idx, "unitCost", e.target.value)} placeholder="0.00" className="h-7 text-xs text-right w-full" />
                        </td>
                        <td className="px-3 py-1.5 text-right font-semibold text-gray-700 whitespace-nowrap">
                          {format(line.totalCost)}
                        </td>
                        <td className="px-1 py-1.5 text-center">
                          {lines.length > 1 && (
                            <button onClick={() => removeLine(idx)} className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500">
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-gray-200 bg-gray-50">
                      <td colSpan={3} className="px-3 py-2 text-right font-semibold text-gray-700 text-xs">Grand Total</td>
                      <td className="px-3 py-2 text-right font-bold text-gray-900 text-sm whitespace-nowrap">{format(grandTotal)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Record Purchase & Update Stock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
