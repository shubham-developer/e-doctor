"use client";

import { useState } from "react";
import { useApiQuery } from "@/lib/useApiQuery";
import { toast } from "sonner";
import { Plus, PackageMinus, X } from "lucide-react";
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
import type { InventoryIssue, InventoryItem } from "./types";

interface Props {
  items: InventoryItem[];
}

const DEPARTMENTS = [
  "OPD",
  "IPD / General Ward",
  "ICU",
  "Emergency",
  "OT / Operation Theatre",
  "Lab / Pathology",
  "Radiology",
  "Pharmacy",
  "Kitchen",
  "Laundry",
  "Maintenance",
  "Administration",
  "Other",
];

interface LineItem {
  itemId: string;
  itemName: string;
  quantity: string;
  unitCost: number;
  totalCost: number;
}

export function IssuesTab({ items }: Props) {
  const { can } = useApp();
  const { fmt: format } = useCurrency();

  const [page, setPage] = useState(1);
  const LIMIT = 20;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    department: "",
    issuedTo: "",
    issueDate: new Date().toISOString().slice(0, 10),
    purpose: "",
    notes: "",
  });
  const [lines, setLines] = useState<LineItem[]>([
    { itemId: "", itemName: "", quantity: "", unitCost: 0, totalCost: 0 },
  ]);

  const {
    data: issuesData,
    isPending: loading,
    refetch: load,
  } = useApiQuery<{ issues: InventoryIssue[]; total: number }>(
    ["inventory-issues", page],
    `/api/dashboard/inventory/issues?page=${page}&limit=${LIMIT}`,
    { keepPrevious: true },
  );
  const issues = issuesData?.issues ?? [];
  const total = issuesData?.total ?? 0;

  function openAdd() {
    setForm({
      department: "",
      issuedTo: "",
      issueDate: new Date().toISOString().slice(0, 10),
      purpose: "",
      notes: "",
    });
    setLines([
      { itemId: "", itemName: "", quantity: "", unitCost: 0, totalCost: 0 },
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
        line.unitCost = found?.unitCost ?? 0;
        line.totalCost = (parseFloat(line.quantity) || 0) * line.unitCost;
      }

      if (field === "quantity") {
        line.totalCost = (parseFloat(value) || 0) * line.unitCost;
      }

      next[idx] = line;
      return next;
    });
  }

  function addLine() {
    setLines((p) => [
      ...p,
      { itemId: "", itemName: "", quantity: "", unitCost: 0, totalCost: 0 },
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
    if (!form.issueDate) return toast.error("Issue date is required");

    setSaving(true);
    const res = await apiClient.post("/api/dashboard/inventory/issues", {
      ...form,
      items: validLines.map((l) => ({
        itemId: l.itemId,
        itemName: l.itemName,
        quantity: Number(l.quantity),
        unitCost: l.unitCost,
        totalCost: l.totalCost,
      })),
    });
    setSaving(false);

    if (res.success) {
      toast.success("Issue recorded & stock deducted");
      setDialogOpen(false);
      load();
    } else {
      toast.error(res.error ?? "Failed to record issue");
    }
  }

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">{total} issue records</p>
        {can("inventory", "add") && (
          <Button size="sm" className="h-8 text-xs gap-1.5" onClick={openAdd}>
            <Plus className="w-3.5 h-3.5" />
            New Issue (Stock Out)
          </Button>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">
                  Date
                </th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">
                  Department
                </th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">
                  Issued To
                </th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">
                  Purpose
                </th>
                <th className="text-right px-4 py-2.5 font-semibold text-gray-600">
                  Items
                </th>
                <th className="text-right px-4 py-2.5 font-semibold text-gray-600">
                  Total Value
                </th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">
                  Created By
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : issues.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-gray-400"
                  >
                    <PackageMinus className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No issues recorded yet
                  </td>
                </tr>
              ) : (
                issues.map((iss) => (
                  <tr
                    key={iss._id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-gray-700">
                      {new Date(iss.issueDate).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {iss.department || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {iss.issuedTo || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {iss.purpose || "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {iss.items.length}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {format(iss.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {iss.createdBy || "—"}
                    </td>
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
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Prev
              </Button>
              <span>
                {page} / {totalPages}
              </span>
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

      {/* Add Issue Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogTitle>New Issue Slip (Stock Out)</DialogTitle>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Department
                </label>
                <Select
                  value={form.department}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, department: v ?? "" }))
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Issued To
                </label>
                <Input
                  value={form.issuedTo}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, issuedTo: e.target.value }))
                  }
                  placeholder="Person / ward name"
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Issue Date *
                </label>
                <Input
                  type="date"
                  value={form.issueDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, issueDate: e.target.value }))
                  }
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Purpose
                </label>
                <Input
                  value={form.purpose}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, purpose: e.target.value }))
                  }
                  placeholder="e.g. Daily ward supply"
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
                  style={{ minWidth: "460px", width: "100%" }}
                >
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-3 py-2 font-semibold text-gray-600">
                        Item
                      </th>
                      <th className="text-right px-3 py-2 font-semibold text-gray-600 w-24">
                        Available
                      </th>
                      <th className="text-right px-3 py-2 font-semibold text-gray-600 w-20">
                        Qty
                      </th>
                      <th className="text-right px-3 py-2 font-semibold text-gray-600 w-24">
                        Total
                      </th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {lines.map((line, idx) => {
                      const selectedItem = items.find(
                        (i) => i._id === line.itemId,
                      );
                      return (
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
                                {items
                                  .filter((it) => it.currentStock > 0)
                                  .map((it) => (
                                    <SelectItem key={it._id} value={it._id}>
                                      {it.name} ({it.currentStock} {it.unit})
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-3 py-1.5 text-right text-gray-500 whitespace-nowrap">
                            {selectedItem
                              ? `${selectedItem.currentStock} ${selectedItem.unit}`
                              : "—"}
                          </td>
                          <td className="px-2 py-1.5">
                            <Input
                              type="number"
                              min="1"
                              max={selectedItem?.currentStock}
                              value={line.quantity}
                              onChange={(e) =>
                                updateLine(idx, "quantity", e.target.value)
                              }
                              placeholder="0"
                              className="h-7 text-xs text-right w-full"
                            />
                          </td>
                          <td className="px-3 py-1.5 text-right font-semibold text-gray-700 whitespace-nowrap">
                            {format(line.totalCost)}
                          </td>
                          <td className="px-1 py-1.5 text-center">
                            {lines.length > 1 && (
                              <button
                                onClick={() => removeLine(idx)}
                                className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
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
              {saving ? "Saving…" : "Record Issue & Deduct Stock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
