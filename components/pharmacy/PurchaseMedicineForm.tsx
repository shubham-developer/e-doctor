"use client";

import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, X, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useApp, formatAmount } from "@/lib/context";
import { apiClient } from "@/lib/apiClient";
import type { Medicine } from "@/lib/types/pharmacy";
import type { Supplier } from "./types";

interface PurchaseLine {
  medicineId?: string;
  medicineName: string;
  category: string;
  batchNo: string;
  expiryMonth: string;
  mrp: number | "";
  batchAmount: number | "";
  salePrice: number | "";
  packingQty: number | "";
  quantity: number | "";
  purchasePrice: number | "";
  taxPercent: number | "";
  amount: number;
}

function calcLine(ln: PurchaseLine) {
  return (Number(ln.quantity) || 0) * (Number(ln.purchasePrice) || 0);
}

function calcSummary(lines: PurchaseLine[], discountPercent: number) {
  let total = 0,
    tax = 0;
  for (const ln of lines) {
    const base = calcLine(ln);
    tax += (base * (Number(ln.taxPercent) || 0)) / 100;
    total += base;
  }
  const discount = (total * (Number(discountPercent) || 0)) / 100;
  return { total, discount, tax, net: total - discount + tax };
}

function defaultLine(): PurchaseLine {
  return {
    medicineName: "",
    category: "",
    batchNo: "",
    expiryMonth: "",
    mrp: "",
    batchAmount: "",
    salePrice: "",
    packingQty: "",
    quantity: "",
    purchasePrice: "",
    taxPercent: "",
    amount: 0,
  };
}

export function PurchaseMedicineForm({
  suppliers,
  medicines,
  categories,
  onClose,
  onSaved,
}: {
  suppliers: Supplier[];
  medicines: Medicine[];
  categories: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { tenant } = useApp();
  const symbol = tenant?.currencySymbol || "₹";
  const fmt = (n: number) => formatAmount(n, tenant?.currency);
  const [supplierId, setSupplierId] = useState("");
  const [billNo, setBillNo] = useState("");
  const [note, setNote] = useState("");
  const [discountPercent, setDiscountPercent] = useState<number | "">("");
  const [paymentMode, setPaymentMode] = useState("");
  const [paymentAmount, setPaymentAmount] = useState<number | "">("");
  const [paymentNote, setPaymentNote] = useState("");
  const [lines, setLines] = useState<PurchaseLine[]>([defaultLine()]);
  const [saving, setSaving] = useState(false);

  function updateLine(idx: number, patch: Partial<PurchaseLine>) {
    setLines((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      next[idx].amount = calcLine(next[idx]);
      return next;
    });
  }

  function selectCategory(idx: number, cat: string) {
    updateLine(idx, {
      category: cat,
      medicineName: "",
      medicineId: undefined,
      salePrice: "",
      taxPercent: "",
    });
  }

  function selectMedicine(idx: number, medId: string) {
    const med = medicines.find((m) => m._id === medId);
    if (!med) return;
    updateLine(idx, {
      medicineId: med._id,
      medicineName: med.name,
      salePrice: med.salePrice || "",
      taxPercent: med.taxPercent || "",
    });
  }

  const medicinesInCat = (cat: string) =>
    medicines.filter((m) => !cat || m.category === cat);
  const summary = calcSummary(lines, Number(discountPercent) || 0);
  const now = format(new Date(), "MM/dd/yyyy hh:mm a");

  async function handleSave() {
    if (!supplierId) {
      toast.error("Select a supplier");
      return;
    }
    if (lines.some((l) => !l.medicineName)) {
      toast.error("Fill medicine name for all rows");
      return;
    }
    if (lines.some((l) => !l.batchNo || !l.expiryMonth)) {
      toast.error("Fill batch no and expiry month for all rows");
      return;
    }
    if (lines.some((l) => !l.quantity || Number(l.quantity) <= 0)) {
      toast.error("Enter valid quantity for all rows");
      return;
    }
    if (lines.some((l) => !l.purchasePrice || Number(l.purchasePrice) <= 0)) {
      toast.error("Enter valid purchase price for all rows");
      return;
    }
    setSaving(true);
    try {
      const data = await apiClient.post<{ purchaseNo: number }>(
        "/api/dashboard/pharmacy/purchases",
        {
          supplierId,
          billNo,
          note,
          discountPercent: Number(discountPercent) || 0,
          paymentMode,
          paymentAmount: Number(paymentAmount) || 0,
          paymentNote,
          lines: lines.map((l) => ({
            medicineId: l.medicineId,
            medicineName: l.medicineName,
            category: l.category,
            batchNo: l.batchNo,
            expiryMonth: l.expiryMonth,
            mrp: Number(l.mrp) || 0,
            batchAmount: Number(l.batchAmount) || 0,
            salePrice: Number(l.salePrice) || 0,
            packingQty: Number(l.packingQty) || 0,
            quantity: Number(l.quantity) || 0,
            purchasePrice: Number(l.purchasePrice) || 0,
            taxPercent: Number(l.taxPercent) || 0,
            amount: l.amount,
          })),
          totalAmount: summary.total,
          discountAmount: summary.discount,
          taxAmount: summary.tax,
          netAmount: summary.net,
        },
      );
      if (!data.success) {
        toast.error(data.error);
        return;
      }
      toast.success(`Purchase PCHNO${data.data.purchaseNo} created`);
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Blue top bar */}
      <div className="bg-blue-600 text-white flex items-center gap-2 px-3 h-12 shrink-0">
        <div className="flex-1 min-w-0 max-w-md">
          <SearchableSelect
            value={supplierId}
            onValueChange={setSupplierId}
            options={suppliers.map((s) => ({ value: s._id, label: s.name }))}
            placeholder="Select Supplier"
            emptyText="No suppliers found"
          />
        </div>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto text-white hover:text-gray-200"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Bill info bar */}
      <div className="bg-gray-50 border-b px-4 py-2 flex items-center gap-8 text-sm shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-medium">Bill No</span>
          <input
            value={billNo}
            onChange={(e) => setBillNo(e.target.value)}
            className="border border-gray-300 rounded px-2 h-8 text-sm w-32"
          />
        </div>
        <span className="ml-auto font-medium">
          Purchase Date&nbsp;
          <span className="font-normal text-gray-600">{now}</span>
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pt-3">
          <table className="w-full table-fixed text-xs border-collapse">
            <colgroup>
              <col className="w-[10%]" />
              <col className="w-[16%]" />
              <col className="w-[7%]" />
              <col className="w-[7%]" />
              <col className="w-[7%]" />
              <col className="w-[8%]" />
              <col className="w-[7%]" />
              <col className="w-[7%]" />
              <col className="w-[6%]" />
              <col className="w-[8%]" />
              <col className="w-[6%]" />
              <col className="w-[8%]" />
              <col className="w-[3%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-gray-200">
                {[
                  { label: "Medicine Category *", align: "text-left" },
                  { label: "Medicine Name *", align: "text-left" },
                  { label: "Batch No *", align: "text-left" },
                  { label: "Expiry Month *", align: "text-left" },
                  { label: `MRP (${symbol}) *`, align: "text-left" },
                  { label: `Batch Amount (${symbol})`, align: "text-left" },
                  { label: `Sale Price (${symbol}) *`, align: "text-left" },
                  { label: "Packing Qty", align: "text-left" },
                  { label: "Quantity *", align: "text-left" },
                  { label: `Purchase Price (${symbol}) *`, align: "text-left" },
                  { label: "Tax *", align: "text-left" },
                  { label: `Amount (${symbol}) *`, align: "text-right" },
                  { label: "", align: "text-center" },
                ].map((h) => (
                  <th
                    key={h.label}
                    className={`${h.align} align-bottom pt-2 pb-1.5 pr-2 font-medium text-gray-600 text-[11px] leading-tight`}
                  >
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map((ln, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-1.5 pr-2">
                    <SearchableSelect
                      value={ln.category}
                      onValueChange={(v) => selectCategory(i, v)}
                      options={categories.map((c) => ({ value: c, label: c }))}
                      placeholder="Category"
                      clearable={false}
                      triggerClassName="h-8 text-xs px-2"
                    />
                  </td>
                  <td className="py-1.5 pr-2">
                    <SearchableSelect
                      value={ln.medicineId ?? ""}
                      onValueChange={(v) => selectMedicine(i, v)}
                      options={medicinesInCat(ln.category).map((m) => ({
                        value: m._id,
                        label: m.name,
                      }))}
                      placeholder="Medicine"
                      clearable={false}
                      triggerClassName="h-8 text-xs px-2"
                    />
                  </td>
                  <td className="py-1.5 pr-2">
                    <input
                      value={ln.batchNo}
                      onChange={(e) =>
                        updateLine(i, { batchNo: e.target.value })
                      }
                      className="border border-gray-300 rounded px-1.5 h-8 text-xs w-full"
                    />
                  </td>
                  <td className="py-1.5 pr-2">
                    <input
                      type="month"
                      value={ln.expiryMonth}
                      onChange={(e) =>
                        updateLine(i, { expiryMonth: e.target.value })
                      }
                      className="border border-gray-300 rounded px-1.5 h-8 text-xs w-full"
                    />
                  </td>
                  <td className="py-1.5 pr-2">
                    <input
                      type="number"
                      min="0"
                      value={ln.mrp}
                      onChange={(e) =>
                        updateLine(i, {
                          mrp:
                            e.target.value === "" ? "" : Number(e.target.value),
                        })
                      }
                      className="border border-gray-300 rounded px-1.5 h-8 text-xs w-full"
                    />
                  </td>
                  <td className="py-1.5 pr-2">
                    <input
                      type="number"
                      min="0"
                      value={ln.batchAmount}
                      onChange={(e) =>
                        updateLine(i, {
                          batchAmount:
                            e.target.value === "" ? "" : Number(e.target.value),
                        })
                      }
                      className="border border-gray-300 rounded px-1.5 h-8 text-xs w-full"
                    />
                  </td>
                  <td className="py-1.5 pr-2">
                    <input
                      type="number"
                      min="0"
                      value={ln.salePrice}
                      onChange={(e) =>
                        updateLine(i, {
                          salePrice:
                            e.target.value === "" ? "" : Number(e.target.value),
                        })
                      }
                      className="border border-gray-300 rounded px-1.5 h-8 text-xs w-full"
                    />
                  </td>
                  <td className="py-1.5 pr-2">
                    <input
                      type="number"
                      min="0"
                      value={ln.packingQty}
                      onChange={(e) =>
                        updateLine(i, {
                          packingQty:
                            e.target.value === "" ? "" : Number(e.target.value),
                        })
                      }
                      className="border border-gray-300 rounded px-1.5 h-8 text-xs w-full"
                    />
                  </td>
                  <td className="py-1.5 pr-2">
                    <input
                      type="number"
                      min="0"
                      value={ln.quantity}
                      onChange={(e) =>
                        updateLine(i, {
                          quantity:
                            e.target.value === "" ? "" : Number(e.target.value),
                        })
                      }
                      className="border border-gray-300 rounded px-1.5 h-8 text-xs w-full"
                    />
                  </td>
                  <td className="py-1.5 pr-2">
                    <input
                      type="number"
                      min="0"
                      value={ln.purchasePrice}
                      onChange={(e) =>
                        updateLine(i, {
                          purchasePrice:
                            e.target.value === "" ? "" : Number(e.target.value),
                        })
                      }
                      className="border border-gray-300 rounded px-1.5 h-8 text-xs w-full"
                    />
                  </td>
                  <td className="py-1.5 pr-2">
                    <div className="flex items-center gap-0.5">
                      <input
                        type="number"
                        min="0"
                        value={ln.taxPercent}
                        onChange={(e) =>
                          updateLine(i, {
                            taxPercent:
                              e.target.value === ""
                                ? ""
                                : Number(e.target.value),
                          })
                        }
                        className="border border-gray-300 rounded px-1.5 h-8 text-xs w-full min-w-0"
                      />
                      <span className="text-gray-400 shrink-0">%</span>
                    </div>
                  </td>
                  <td className="py-1.5 pr-2 text-right font-medium">
                    {fmt(ln.amount)}
                  </td>
                  <td className="py-1.5 text-center">
                    <button
                      type="button"
                      onClick={() =>
                        setLines((prev) => prev.filter((_, j) => j !== i))
                      }
                      className="text-red-400 hover:text-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            type="button"
            onClick={() => setLines((prev) => [...prev, defaultLine()])}
            className="mt-2 text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>

        <div className="px-4 pt-4 pb-6 grid grid-cols-2 gap-6">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Note
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="border border-gray-300 rounded px-2 py-1.5 text-xs w-full resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Attach Document
              </label>
              <div className="border border-dashed border-gray-300 rounded flex items-center justify-center gap-2 text-gray-400 text-xs cursor-not-allowed h-20">
                <UploadCloud className="w-5 h-5" />
                Drop a file here or click
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between border-b border-gray-100 py-1">
              <span className="text-xs text-gray-600">Total ({symbol})</span>
              <span className="text-xs font-medium">{fmt(summary.total)}</span>
            </div>
            <div className="flex items-center justify-between border-b border-gray-100 py-1">
              <span className="text-xs text-gray-600">Discount ({symbol})</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  value={discountPercent}
                  onChange={(e) =>
                    setDiscountPercent(
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                  className="border border-gray-300 rounded px-2 h-8 text-xs w-16 text-right"
                />
                <span className="text-[11px] text-gray-400">%</span>
              </div>
              <span className="text-xs font-medium">
                {fmt(summary.discount)}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-gray-100 py-1">
              <span className="text-xs text-gray-600">Tax ({symbol})</span>
              <span className="text-xs font-medium">{fmt(summary.tax)}</span>
            </div>
            <div className="flex items-center justify-between border-b border-gray-100 py-1">
              <span className="text-xs text-gray-600">
                Net Amount ({symbol})
              </span>
              <span className="text-xs font-medium">{fmt(summary.net)}</span>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Payment Mode
                </label>
                <SearchableSelect
                  value={paymentMode}
                  onValueChange={setPaymentMode}
                  options={[
                    "Cash",
                    "Card",
                    "UPI",
                    "Bank Transfer",
                    "Cheque",
                  ].map((m) => ({ value: m, label: m }))}
                  placeholder="Payment mode"
                  clearable={false}
                  triggerClassName="h-8 text-xs px-2"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Payment Amount ({symbol})
                </label>
                <input
                  type="number"
                  min="0"
                  value={paymentAmount}
                  onChange={(e) =>
                    setPaymentAmount(
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                  className="border border-gray-300 rounded px-2 h-8 text-xs w-full"
                />
              </div>
            </div>
            <div className="pt-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Payment Note
              </label>
              <textarea
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                rows={2}
                className="border border-gray-300 rounded px-2 py-1.5 text-xs w-full resize-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t px-4 py-3 flex justify-end gap-2 shrink-0">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
