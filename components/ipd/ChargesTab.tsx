"use client";

import { useEffect, useState } from "react";
import { useApp, useCurrency } from "@/lib/context";
import { apiClient } from "@/lib/apiClient";
import { Plus, Pencil, Trash2, IndianRupee } from "lucide-react";
import type { ChargeLookup } from "@/lib/types/charges";
import type { IpdDetail, IpdCharge } from "@/components/ipd/types";

export function ChargesTab({
  ipdId,
  admission,
}: {
  ipdId: string;
  admission: IpdDetail;
}) {
  const { sym, fmt } = useCurrency();
  const { tenant } = useApp();
  const [charges, setCharges] = useState<IpdCharge[]>([]);
  const [categories, setCategories] = useState<ChargeLookup[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editItem, setEditItem] = useState<IpdCharge | null>(null);

  // form state
  const [catName, setCatName] = useState("");
  const [qty, setQty] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [chargeDate, setChargeDate] = useState("");
  const [note, setNote] = useState("");

  function resetForm() {
    setCatName("");
    setQty("1");
    setUnitPrice("");
    setChargeDate("");
    setNote("");
    setEditItem(null);
  }

  async function loadCharges() {
    const d = await apiClient.get<IpdCharge[]>(
      `/api/dashboard/ipd/${ipdId}/charges`,
    );
    if (d.success) setCharges(d.data);
  }

  useEffect(() => {
    loadCharges();
    apiClient
      .get<ChargeLookup[]>("/api/dashboard/charges?module=ipd")
      .then((d) => {
        if (d.success) setCategories(d.data.filter((c) => c.isActive));
      });
  }, [ipdId]);

  function onCatChange(name: string) {
    setCatName(name);
    const cat = categories.find((c) => c.name === name);
    if (cat) setUnitPrice(String(cat.standardCharge));
  }

  async function handleSave() {
    if (!catName) {
      return;
    }
    setSaving(true);
    try {
      if (editItem) {
        const d = await apiClient.patch(
          `/api/dashboard/ipd/${ipdId}/charges/${editItem._id}`,
          {
            categoryName: catName,
            quantity: Number(qty),
            unitPrice: Number(unitPrice),
            note,
            date: chargeDate,
          },
        );
        if (d.success) {
          await loadCharges();
          setShowForm(false);
          resetForm();
        }
      } else {
        const d = await apiClient.post(`/api/dashboard/ipd/${ipdId}/charges`, {
          categoryName: catName,
          quantity: Number(qty),
          unitPrice: Number(unitPrice),
          note,
          date: chargeDate,
        });
        if (d.success) {
          await loadCharges();
          setShowForm(false);
          resetForm();
        }
      }
    } finally {
      setSaving(false);
    }
  }

  function startEdit(c: IpdCharge) {
    setEditItem(c);
    setCatName(c.categoryName);
    setQty(String(c.quantity));
    setUnitPrice(String(c.unitPrice));
    setNote(c.note ?? "");
    setChargeDate(c.date);
    setShowForm(true);
  }

  async function deleteCharge(id: string) {
    await apiClient.delete(`/api/dashboard/ipd/${ipdId}/charges/${id}`);
    loadCharges();
  }

  const total = charges.reduce((s, c) => s + c.total, 0);
  const inp =
    "h-8 w-full px-2 text-xs border border-gray-300 rounded focus:border-primary-400 focus:ring-1 focus:ring-primary-100 outline-none bg-white";
  const lbl = "block text-2xs font-semibold text-gray-500 uppercase mb-1";

  function billData(
    totalPaid: number,
    balance: number,
    payment: {
      amount: number;
      paymentMode: string;
      note?: string;
      date: string;
      addedByName?: string;
    },
  ) {
    const p = admission.patientId;
    return {
      ipdNumber: admission.ipdNumber,
      admissionDate: admission.admissionDate,
      dischargeDate: admission.dischargeDate,
      caseNumber: admission.caseNumber,
      bedNumber: admission.bedNumber,
      bedGroup: admission.bedGroup,
      patientName: p?.name ?? "—",
      patientCode: p?.patientCode,
      patientAge: p?.age,
      patientAgeMonths: p?.ageMonths,
      patientAgeDays: p?.ageDays,
      patientGender: p?.gender,
      patientPhone: p?.phone,
      patientBloodGroup: p?.bloodGroup,
      doctorName: admission.doctorId?.name,
      doctorSpecialization: admission.doctorId?.specialization,
      charges,
      totalCharges: total,
      payment,
      totalPaid,
      balance,
      currency: tenant?.currency,
      currencySymbol: tenant?.currencySymbol ?? "₹",
      clinicName: tenant?.name ?? "Hospital",
      clinicAddress: tenant?.address,
      logoUrl: tenant?.logoUrl,
    };
  }

  return (
    <div className="p-4 space-y-4">
      {/* Summary + Add button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IndianRupee className="w-4 h-4 text-primary-600" />
          <span className="text-sm font-semibold text-gray-800">
            Total Charges:
          </span>
          <span className="text-sm font-bold text-primary-700">{fmt(total)}</span>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm((v) => !v);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add Charge
        </button>
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <div className="border border-primary-200 bg-primary-50/40 rounded-lg p-4 space-y-3">
          <p className="text-xs font-semibold text-primary-700">
            {editItem ? "Edit Charge" : "New Charge"}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className={lbl}>
                Charge Category <span className="text-danger-500">*</span>
              </label>
              <select
                value={catName}
                onChange={(e) => onCatChange(e.target.value)}
                className={inp}
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c._id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={lbl}>Date</label>
              <input
                type="date"
                value={chargeDate}
                onChange={(e) => setChargeDate(e.target.value)}
                className={inp}
              />
            </div>
            <div>
              <label className={lbl}>Quantity</label>
              <input
                type="number"
                value={qty}
                min={1}
                onChange={(e) => setQty(e.target.value)}
                className={inp}
              />
            </div>
            <div>
              <label className={lbl}>Unit Price</label>
              <input
                type="number"
                value={unitPrice}
                min={0}
                onChange={(e) => setUnitPrice(e.target.value)}
                className={inp}
                placeholder="0.00"
              />
            </div>
            <div className="col-span-2">
              <label className={lbl}>Note (optional)</label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className={inp}
                placeholder="Note..."
              />
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-gray-500">
              Total:{" "}
              <span className="font-semibold text-gray-900">
                {fmt((Number(qty) || 0) * (Number(unitPrice) || 0))}
              </span>
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !catName}
                className="px-3 py-1.5 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50 font-medium"
              >
                {saving ? "Saving…" : editItem ? "Update" : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Charges table */}
      {charges.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
          <IndianRupee className="w-10 h-10 opacity-20" />
          <p className="text-sm">No charges added yet</p>
          <p className="text-xs">Click "Add Charge" to add a billable item</p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Date
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Category
                </th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Qty
                </th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Unit Price
                </th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Total
                </th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {charges.map((c) => (
                <tr key={c._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-500">{c.date}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-800">
                      {c.categoryName}
                    </p>
                    {c.note && (
                      <p className="text-xs text-gray-400">{c.note}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-700">
                    {c.quantity}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-700">
                    {fmt(c.unitPrice)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                    {fmt(c.total)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => startEdit(c)}
                        className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-primary-600 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteCharge(c._id)}
                        className="p-1 rounded hover:bg-danger-50 text-gray-400 hover:text-danger-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t border-gray-200">
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-2.5 text-xs font-semibold text-gray-600 text-right uppercase tracking-wide"
                >
                  Grand Total
                </td>
                <td className="px-4 py-2.5 text-right text-sm font-bold text-primary-700">
                  {fmt(total)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
