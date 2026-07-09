"use client";

import { useMemo, useState } from "react";
import { useApp, useCurrency } from "@/lib/context";
import { apiClient } from "@/lib/apiClient";
import { useApiQuery } from "@/lib/useApiQuery";
import { Plus, Pencil, Trash2, CreditCard, CheckCircle2, Printer } from "lucide-react";
import { printIpdBill } from "@/components/ipd/IpdBillPrinter";
import { Button } from "@/components/ui/button";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { AddPaymentDialog } from "@/components/ipd/AddPaymentDialog";
import type { IpdDetail, IpdCharge, IpdPayment } from "@/components/ipd/types";

export function PaymentsTab({
  ipdId,
  admission,
}: {
  ipdId: string;
  admission: IpdDetail;
}) {
  const { fmt } = useCurrency();
  const { tenant } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<IpdPayment | null>(null);

  const { data: chargesQueryData, refetch: refetchCharges } = useApiQuery<
    IpdCharge[]
  >(["ipd-charges", ipdId], `/api/dashboard/ipd/${ipdId}/charges`);
  const { data: paymentsData, refetch: refetchPayments } = useApiQuery<
    IpdPayment[]
  >(["ipd-payments", ipdId], `/api/dashboard/ipd/${ipdId}/payments`);
  const charges = chargesQueryData ?? [];
  const payments = paymentsData ?? [];
  const totalCharges = charges.reduce((s, c) => s + c.total, 0);

  function loadAll() {
    refetchCharges();
    refetchPayments();
  }

  function startEdit(p: IpdPayment) {
    setEditItem(p);
    setShowForm(true);
  }

  async function deletePayment(id: string) {
    await apiClient.delete(`/api/dashboard/ipd/${ipdId}/payments/${id}`);
    loadAll();
  }

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const balance = totalCharges - totalPaid;

  // Cumulative amount paid as of each payment, keyed by payment id — used for
  // the printed bill's running balance. Computed from the API's chronological
  // order, independent of how the table is currently sorted for display.
  const paidUpToById = useMemo(() => {
    const map = new Map<string, number>();
    let running = 0;
    for (const p of payments) {
      running += p.amount;
      map.set(p._id, running);
    }
    return map;
  }, [payments]);

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
      uhid: pt?.uhid,
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
      printLayouts: tenant?.printLayouts,
    };
  }

  const columns: ColumnDef<IpdPayment>[] = [
    {
      key: "date",
      header: "Date",
      accessor: "date",
      sortable: true,
      width: "w-28",
      render: (p) => <span className="text-xs text-gray-500">{p.date}</span>,
    },
    {
      key: "paymentMode",
      header: "Mode",
      accessor: "paymentMode",
      sortable: true,
      render: (p) => (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium bg-primary-50 text-primary-700">
          {p.paymentMode}
        </span>
      ),
    },
    {
      key: "note",
      header: "Note",
      accessor: "note",
      render: (p) => (
        <span className="text-xs text-gray-500">{p.note || "—"}</span>
      ),
      csvValue: (p) => p.note ?? "",
    },
    {
      key: "addedByName",
      header: "By",
      accessor: "addedByName",
      width: "w-28",
      render: (p) => (
        <span className="text-xs text-gray-500">{p.addedByName || "—"}</span>
      ),
      csvValue: (p) => p.addedByName ?? "",
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      sortable: true,
      sortValue: (p) => p.amount,
      render: (p) => (
        <span className="text-xs font-semibold text-success-700">
          {fmt(p.amount)}
        </span>
      ),
      csvValue: (p) => String(p.amount),
    },
    {
      key: "actions",
      header: "",
      width: "w-20",
      align: "right",
      render: (p) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() =>
              printIpdBill(billBase(paidUpToById.get(p._id) ?? p.amount, p))
            }
            title="Print Bill"
            className="text-primary-600 hover:text-primary-700 hover:bg-primary-50"
          >
            <Printer className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => startEdit(p)}
            className="text-gray-400 hover:text-primary-600 hover:bg-gray-100"
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => deletePayment(p._id)}
            className="text-gray-400 hover:text-danger-500 hover:bg-danger-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 space-y-4">
      {/* Balance summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="border border-gray-200 rounded-lg p-3 bg-white">
          <p className="text-2xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Total Charges
          </p>
          <p className="text-lg font-bold text-gray-900">{fmt(totalCharges)}</p>
        </div>
        <div className="border border-success-200 rounded-lg p-3 bg-success-50">
          <p className="text-2xs font-semibold text-success-600 uppercase tracking-wide mb-1">
            Total Paid
          </p>
          <p className="text-lg font-bold text-success-700">{fmt(totalPaid)}</p>
        </div>
        <div
          className={`border rounded-lg p-3 ${balance <= 0 ? "border-success-200 bg-success-50" : "border-danger-200 bg-danger-50"}`}
        >
          <p
            className={`text-2xs font-semibold uppercase tracking-wide mb-1 ${balance <= 0 ? "text-success-600" : "text-danger-500"}`}
          >
            {balance <= 0 ? "Fully Paid" : "Balance Due"}
          </p>
          <div className="flex items-center gap-1.5">
            {balance <= 0 ? (
              <CheckCircle2 className="w-4 h-4 text-success-600" />
            ) : null}
            <p
              className={`text-lg font-bold ${balance <= 0 ? "text-success-700" : "text-danger-600"}`}
            >
              {fmt(Math.abs(balance))}
            </p>
          </div>
        </div>
      </div>

      {/* Add payment button */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">Payment History</p>
        <Button
          size="sm"
          onClick={() => {
            setEditItem(null);
            setShowForm(true);
          }}
        >
          <Plus className="w-3.5 h-3.5" /> Add Payment
        </Button>
      </div>

      {/* Payments table */}
      <DataTable
        columns={columns}
        data={payments}
        rowKey={(p) => p._id}
        emptyNode={
          <div className="flex flex-col items-center justify-center gap-2">
            <CreditCard className="w-10 h-10 opacity-20" />
            <p className="text-sm">No payments recorded yet</p>
            <p className="text-xs">
              Click &quot;Add Payment&quot; to record a payment
            </p>
          </div>
        }
        wrapperClassName="rounded-lg"
        downloadable
        printable
        fileName="IPD Payments"
      />

      <AddPaymentDialog
        ipdId={ipdId}
        open={showForm}
        editItem={editItem}
        onClose={() => setShowForm(false)}
        onSaved={loadAll}
      />
    </div>
  );
}
