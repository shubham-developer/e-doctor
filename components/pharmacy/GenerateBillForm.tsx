"use client";

import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Search, X, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useApp, formatAmount } from "@/lib/context";
import { apiClient } from "@/lib/apiClient";
import type { Medicine } from "@/lib/types/pharmacy";
import { PatientCombobox } from "./PatientCombobox";
import type { PatientOption, PharmacyBill } from "./types";

interface BillLine {
  medicineId?: string;
  medicineName: string;
  category: string;
  batchNo: string;
  expiryDate: string;
  quantity: number | "";
  availableQty: number;
  salePrice: number | "";
  taxPercent: number | "";
  discountPercent: number | "";
  amount: number;
}

function calcLine(ln: BillLine) {
  return (Number(ln.quantity) || 0) * (Number(ln.salePrice) || 0);
}

function calcSummary(lines: BillLine[]) {
  let total = 0,
    discount = 0,
    tax = 0;
  for (const ln of lines) {
    const base = calcLine(ln);
    const disc = (base * (Number(ln.discountPercent) || 0)) / 100;
    tax += ((base - disc) * (Number(ln.taxPercent) || 0)) / 100;
    discount += disc;
    total += base;
  }
  return { total, discount, tax, net: total - discount + tax };
}

function defaultLine(): BillLine {
  return {
    medicineName: "",
    category: "",
    batchNo: "",
    expiryDate: "",
    quantity: "",
    availableQty: 0,
    salePrice: "",
    taxPercent: "",
    discountPercent: "",
    amount: 0,
  };
}

export function GenerateBillForm({
  billNumber,
  medicines,
  categories,
  doctors,
  onClose,
  onSaved,
}: {
  billNumber: number;
  medicines: Medicine[];
  categories: string[];
  doctors: { _id: string; name: string }[];
  onClose: () => void;
  onSaved: (bill: PharmacyBill) => void;
}) {
  const { tenant } = useApp();
  const symbol = tenant?.currencySymbol || "₹";
  const fmt = (n: number) => formatAmount(n, tenant?.currency);
  const [patient, setPatient] = useState<PatientOption | null>(null);
  const [prescriptionNo, setPrescriptionNo] = useState("");
  const [applyTpa, setApplyTpa] = useState(false);
  const [caseId, setCaseId] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [note, setNote] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [paidAmount, setPaidAmount] = useState<number | "">("");
  const [lines, setLines] = useState<BillLine[]>([defaultLine()]);
  const [saving, setSaving] = useState(false);
  const [qtyErrors, setQtyErrors] = useState<Record<number, string>>({});

  function updateLine(idx: number, patch: Partial<BillLine>) {
    setLines((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      next[idx].amount = calcLine(next[idx]);
      return next;
    });
    if ("quantity" in patch) {
      setQtyErrors((prev) => {
        if (!(idx in prev)) return prev;
        const next = { ...prev };
        delete next[idx];
        return next;
      });
    }
  }

  function lineQtyError(l: BillLine): string {
    if (!l.quantity || Number(l.quantity) <= 0) return "Enter a valid quantity";
    if (l.medicineId && Number(l.quantity) > l.availableQty)
      return `Exceeds available stock (${l.availableQty})`;
    return "";
  }

  function selectCategory(idx: number, cat: string) {
    updateLine(idx, {
      category: cat,
      medicineName: "",
      medicineId: undefined,
      batchNo: "",
      expiryDate: "",
      availableQty: 0,
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
      batchNo: med.batchNo ?? "",
      expiryDate: med.expiryDate ?? "",
      availableQty: med.availableQty,
      salePrice: med.salePrice,
      taxPercent: med.taxPercent,
    });
  }

  const summary = calcSummary(lines);

  async function handleSave() {
    if (lines.some((l) => !l.medicineName)) {
      toast.error("Fill medicine name for all rows");
      return;
    }

    const errors: Record<number, string> = {};
    lines.forEach((l, i) => {
      const err = lineQtyError(l);
      if (err) errors[i] = err;
    });
    setQtyErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast.error("Fix the highlighted quantity fields");
      return;
    }

    setSaving(true);
    try {
      const data = await apiClient.post<{
        billNumber: number;
        bill: PharmacyBill;
      }>("/api/dashboard/pharmacy/bills", {
        patientId: patient?.id,
        caseId,
        prescriptionNo,
        applyTpa,
        doctorName,
        note,
        paymentMode,
        paidAmount: Number(paidAmount) || 0,
        lines: lines.map((l) => ({
          medicineId: l.medicineId,
          medicineName: l.medicineName,
          category: l.category,
          batchNo: l.batchNo,
          expiryDate: l.expiryDate,
          quantity: Number(l.quantity) || 0,
          salePrice: Number(l.salePrice) || 0,
          taxPercent: Number(l.taxPercent) || 0,
          discountPercent: Number(l.discountPercent) || 0,
          amount: l.amount,
        })),
        totalAmount: summary.total,
        discountAmount: summary.discount,
        taxAmount: summary.tax,
        netAmount: summary.net,
      });
      if (!data.success) {
        toast.error(data.error);
        return;
      }
      toast.success(`Bill #${data.data.billNumber} created`);
      onSaved(data.data.bill);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const medicinesInCat = (cat: string) =>
    medicines.filter((m) => !cat || m.category === cat);
  const now = format(new Date(), "MM/dd/yyyy hh:mm a");

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Blue top bar */}
      <div className="bg-primary-600 text-white flex items-center gap-2 px-3 h-12 shrink-0">
        <PatientCombobox value={patient} onChange={setPatient} />
        <button
          type="button"
          onClick={() => toast.info("New patient flow coming soon")}
          className="shrink-0 border border-white text-white text-xs px-3 h-8 rounded hover:bg-primary-700 flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> New Patient
        </button>
        <div className="relative shrink-0" style={{ width: 240 }}>
          <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={prescriptionNo}
            onChange={(e) => setPrescriptionNo(e.target.value)}
            placeholder="Prescription No"
            className="w-full pl-7 pr-2 h-8 text-sm text-gray-800 bg-white border border-gray-300 rounded outline-none"
          />
        </div>
        <label className="flex items-center gap-1.5 text-sm shrink-0">
          <input
            type="checkbox"
            checked={applyTpa}
            onChange={(e) => setApplyTpa(e.target.checked)}
            className="w-4 h-4"
          />
          Apply TPA
        </label>
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
        <span>
          <span className="font-medium">Bill No</span>&nbsp;{billNumber}
        </span>
        <div className="flex items-center gap-2">
          <span className="font-medium">Case ID</span>
          <input
            value={caseId}
            onChange={(e) => setCaseId(e.target.value)}
            className="border border-gray-300 rounded px-2 h-8 text-sm w-28"
          />
        </div>
        <span className="ml-auto text-gray-500">Date {now}</span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pt-3">
          <table className="w-full table-fixed text-xs border-collapse">
            <colgroup>
              <col className="w-[12%]" />
              <col className="w-[19%]" />
              <col className="w-[8%]" />
              <col className="w-[9%]" />
              <col className="w-[7%]" />
              <col className="w-[8%]" />
              <col className="w-[9%]" />
              <col className="w-[7%]" />
              <col className="w-[8%]" />
              <col className="w-[10%]" />
              <col className="w-[3%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-gray-200">
                {[
                  { label: "Medicine Category *", align: "text-left" },
                  { label: "Medicine Name *", align: "text-left" },
                  { label: "Batch No", align: "text-left" },
                  { label: "Expiry Date", align: "text-left" },
                  { label: "Quantity *", align: "text-left" },
                  { label: "Available Qty", align: "text-center" },
                  { label: `Sale Price (${symbol}) *`, align: "text-left" },
                  { label: "Tax", align: "text-left" },
                  { label: "Discount (%)", align: "text-left" },
                  { label: `Amount (${symbol})`, align: "text-right" },
                  { label: "", align: "text-center" },
                ].map((h) => (
                  <th
                    key={h.label}
                    className={`${h.align} align-bottom pt-2 pb-1.5 pr-2 font-medium text-gray-600 text-2xs leading-tight`}
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
                      value={ln.expiryDate}
                      onChange={(e) =>
                        updateLine(i, { expiryDate: e.target.value })
                      }
                      className="border border-gray-300 rounded px-1.5 h-8 text-xs w-full"
                    />
                  </td>
                  <td className="py-1.5 pr-2 relative">
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
                      className={`border rounded px-1.5 h-8 text-xs w-full ${qtyErrors[i] ? "border-danger-500 focus:outline-danger-500" : "border-gray-300"}`}
                    />
                    {qtyErrors[i] && (
                      <p className="absolute top-full left-0 z-10 mt-0.5 whitespace-nowrap text-2xs text-danger-500">
                        {qtyErrors[i]}
                      </p>
                    )}
                  </td>
                  <td className="py-1.5 pr-2 text-gray-500 text-center">
                    {ln.availableQty}
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
                  <td className="py-1.5 pr-2">
                    <div className="flex items-center gap-0.5">
                      <input
                        type="number"
                        min="0"
                        value={ln.discountPercent}
                        onChange={(e) =>
                          updateLine(i, {
                            discountPercent:
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
                      className="text-danger-400 hover:text-danger-600"
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
            className="mt-2 text-xs bg-primary-600 text-white px-3 py-1 rounded hover:bg-primary-700 flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>

        <div className="px-4 pt-4 pb-6 grid grid-cols-2 gap-6">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Doctor Name
              </label>
              <SearchableSelect
                value={doctorName}
                onValueChange={setDoctorName}
                options={doctors.map((d) => ({ value: d.name, label: d.name }))}
                placeholder="Select doctor"
                emptyText="No doctors found — add in HR"
                triggerClassName="h-8 text-xs px-2"
              />
            </div>
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
          </div>
          <div className="space-y-1.5">
            {[
              { label: `Total (${symbol})`, value: fmt(summary.total) },
              {
                label: `Discount (${symbol})`,
                value: fmt(summary.discount),
                sub: "Discount Gross",
              },
              { label: `Tax (${symbol})`, value: fmt(summary.tax) },
              { label: `Net Amount (${symbol})`, value: fmt(summary.net) },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between border-b border-gray-100 py-1"
              >
                <span className="text-xs text-gray-600">{row.label}</span>
                {row.sub && (
                  <span className="text-2xs text-gray-400 mr-auto ml-4">
                    {row.sub}
                  </span>
                )}
                <span className="text-xs font-medium">{row.value}</span>
              </div>
            ))}
            <div className="flex items-center gap-3 pt-2">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Payment Mode
                </label>
                <SearchableSelect
                  value={paymentMode}
                  onValueChange={setPaymentMode}
                  options={["Cash", "Card", "UPI", "Insurance", "Online"].map(
                    (m) => ({ value: m, label: m }),
                  )}
                  placeholder="Payment mode"
                  clearable={false}
                  triggerClassName="h-8 text-xs px-2"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Payment Amount ({symbol}) *
                </label>
                <input
                  type="number"
                  min="0"
                  value={paidAmount}
                  onChange={(e) =>
                    setPaidAmount(
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                  className="border border-gray-300 rounded px-2 h-8 text-xs w-full"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t px-4 py-3 flex justify-end gap-2 shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5"
        >
          <Printer className="w-4 h-4" /> Save &amp; Print
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving}
          className="bg-primary-600 hover:bg-primary-700"
        >
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
