"use client";

import { useEffect, useState } from "react";
import { useApp, useCurrency } from "@/lib/context";
import { apiClient } from "@/lib/apiClient";
import {
  Plus,
  Pencil,
  Trash2,
  CreditCard,
  CheckCircle2,
  Printer,
} from "lucide-react";
import { printIpdBill } from "@/components/ipd/IpdBillPrinter";
import type { IpdDetail, IpdCharge } from "@/components/ipd/types";

interface IpdPayment {
  _id: string;
  amount: number;
  paymentMode: string;
  note?: string;
  date: string;
  addedByName?: string;
}
const PAYMENT_MODES = [
  "Cash",
  "Card",
  "UPI",
  "Insurance",
  "Cheque",
  "Bank Transfer",
  "Other",
];

export function PaymentsTab({
  ipdId,
  admission,
}: {
  ipdId: string;
  admission: IpdDetail;
}) {
  const { sym, fmt } = useCurrency();
  const { tenant } = useApp();
  const [payments, setPayments] = useState<IpdPayment[]>([]);
  const [charges, setChargesData] = useState<IpdCharge[]>([]);
  const [totalCharges, setTotalCharges] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<IpdPayment | null>(null);
  const [saving, setSaving] = useState(false);

  // form state
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState("Cash");
  const [payNote, setPayNote] = useState("");
  const [payDate, setPayDate] = useState("");

  function resetForm() {
    setAmount("");
    setMode("Cash");
    setPayNote("");
    setPayDate("");
    setEditItem(null);
  }

  async function loadAll() {
    const [ch, pmnts] = await Promise.all([
      apiClient.get<IpdCharge[]>(`/api/dashboard/ipd/${ipdId}/charges`),
      apiClient.get<IpdPayment[]>(`/api/dashboard/ipd/${ipdId}/payments`),
    ]);
    if (ch.success) {
      setChargesData(ch.data);
      setTotalCharges(ch.data.reduce((s, c) => s + c.total, 0));
    }
    if (pmnts.success) setPayments(pmnts.data);
  }

  useEffect(() => {
    loadAll();
  }, [ipdId]);

  async function handleSave() {
    if (!amount || Number(amount) <= 0) return;
    setSaving(true);
    try {
      if (editItem) {
        const d = await apiClient.patch(
          `/api/dashboard/ipd/${ipdId}/payments/${editItem._id}`,
          {
            amount: Number(amount),
            paymentMode: mode,
            note: payNote,
            date: payDate,
          },
        );
        if (d.success) {
          await loadAll();
          setShowForm(false);
          resetForm();
        }
      } else {
        const d = await apiClient.post(`/api/dashboard/ipd/${ipdId}/payments`, {
          amount: Number(amount),
          paymentMode: mode,
          note: payNote,
          date: payDate,
        });
        if (d.success) {
          await loadAll();
          setShowForm(false);
          resetForm();
        }
      }
    } finally {
      setSaving(false);
    }
  }

  function startEdit(p: IpdPayment) {
    setEditItem(p);
    setAmount(String(p.amount));
    setMode(p.paymentMode);
    setPayNote(p.note ?? "");
    setPayDate(p.date);
    setShowForm(true);
  }

  async function deletePayment(id: string) {
    await apiClient.delete(`/api/dashboard/ipd/${ipdId}/payments/${id}`);
    loadAll();
  }

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const balance = totalCharges - totalPaid;
  const inp =
    "h-8 w-full px-2 text-xs border border-gray-300 rounded focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none bg-white";
  const lbl = "block text-[11px] font-semibold text-gray-500 uppercase mb-1";

  function billBase(paidUpTo: number, payment: IpdPayment) {
    const pt = admission.patientId;
    return {
      ipdNumber: admission.ipdNumber,
      admissionDate: admission.admissionDate,
      dischargeDate: admission.dischargeDate,
      caseNumber: admission.caseNumber,
      bedNumber: admission.bedNumber,
      bedGroup: admission.bedGroup,
      patientName: pt?.name ?? "—",
      patientCode: pt?.patientCode,
      patientAge: pt?.age,
      patientAgeMonths: pt?.ageMonths,
      patientAgeDays: pt?.ageDays,
      patientGender: pt?.gender,
      patientPhone: pt?.phone,
      patientBloodGroup: pt?.bloodGroup,
      doctorName: admission.doctorId?.name,
      doctorSpecialization: admission.doctorId?.specialization,
      charges,
      totalCharges,
      payment: {
        amount: payment.amount,
        paymentMode: payment.paymentMode,
        note: payment.note,
        date: payment.date,
        addedByName: payment.addedByName,
      },
      totalPaid: paidUpTo,
      balance: totalCharges - paidUpTo,
      currency: tenant?.currency,
      currencySymbol: tenant?.currencySymbol ?? "₹",
      clinicName: tenant?.name ?? "Hospital",
      clinicAddress: tenant?.address,
      logoUrl: tenant?.logoUrl,
    };
  }

  return (
    <div className="p-4 space-y-4">
      {/* Balance summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="border border-gray-200 rounded-lg p-3 bg-white">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Total Charges
          </p>
          <p className="text-lg font-bold text-gray-900">{fmt(totalCharges)}</p>
        </div>
        <div className="border border-green-200 rounded-lg p-3 bg-green-50">
          <p className="text-[11px] font-semibold text-green-600 uppercase tracking-wide mb-1">
            Total Paid
          </p>
          <p className="text-lg font-bold text-green-700">{fmt(totalPaid)}</p>
        </div>
        <div
          className={`border rounded-lg p-3 ${balance <= 0 ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}
        >
          <p
            className={`text-[11px] font-semibold uppercase tracking-wide mb-1 ${balance <= 0 ? "text-green-600" : "text-red-500"}`}
          >
            {balance <= 0 ? "Fully Paid" : "Balance Due"}
          </p>
          <div className="flex items-center gap-1.5">
            {balance <= 0 ? (
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            ) : null}
            <p
              className={`text-lg font-bold ${balance <= 0 ? "text-green-700" : "text-red-600"}`}
            >
              {fmt(Math.abs(balance))}
            </p>
          </div>
        </div>
      </div>

      {/* Add payment button */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">Payment History</p>
        <button
          onClick={() => {
            resetForm();
            setShowForm((v) => !v);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add Payment
        </button>
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <div className="border border-green-200 bg-green-50/40 rounded-lg p-4 space-y-3">
          <p className="text-xs font-semibold text-green-700">
            {editItem ? "Edit Payment" : "New Payment"}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>
                Amount <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={amount}
                min={0}
                onChange={(e) => setAmount(e.target.value)}
                className={inp}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className={lbl}>Date</label>
              <input
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                className={inp}
              />
            </div>
            <div>
              <label className={lbl}>Payment Mode</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className={inp}
              >
                {PAYMENT_MODES.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={lbl}>Note (optional)</label>
              <input
                value={payNote}
                onChange={(e) => setPayNote(e.target.value)}
                className={inp}
                placeholder="Note..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
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
              disabled={saving || !amount || Number(amount) <= 0}
              className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {saving ? "Saving…" : editItem ? "Update" : "Record Payment"}
            </button>
          </div>
        </div>
      )}

      {/* Payments table */}
      {payments.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
          <CreditCard className="w-10 h-10 opacity-20" />
          <p className="text-sm">No payments recorded yet</p>
          <p className="text-xs">Click "Add Payment" to record a payment</p>
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
                  Mode
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Note
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  By
                </th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Amount
                </th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.map((p, idx) => {
                const paidUpTo = payments
                  .slice(0, idx + 1)
                  .reduce((s, x) => s + x.amount, 0);
                return (
                  <tr key={p._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {p.date}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700">
                        {p.paymentMode}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {p.note || "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {p.addedByName || "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-green-700">
                      {fmt(p.amount)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => printIpdBill(billBase(paidUpTo, p))}
                          title="Print Bill"
                          className="p-1 rounded hover:bg-blue-50 text-blue-600 hover:text-blue-700 transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => startEdit(p)}
                          className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deletePayment(p._id)}
                          className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50 border-t border-gray-200">
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-2.5 text-xs font-semibold text-gray-600 text-right uppercase tracking-wide"
                >
                  Total Paid
                </td>
                <td className="px-4 py-2.5 text-right text-sm font-bold text-green-700">
                  {fmt(totalPaid)}
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
