"use client";

import { useCurrency, useDateFormatter } from "@/lib/context";
import { Badge } from "@/components/ui/badge";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import type { OpdVisitDetail, OpdPatientHistory } from "./types";

interface PaymentRow {
  id: string;
  date?: string;
  module: string;
  reference: string;
  mode?: string;
  amount: number;
  isCurrentVisit?: boolean;
}

export function OpdPaymentsTab({
  visit,
  history,
}: {
  visit: OpdVisitDetail;
  history: OpdPatientHistory | null;
}) {
  const { fmt } = useCurrency();
  const { formatDate } = useDateFormatter();

  const total = visit.totalFee ?? 0;
  const paid = visit.paidAmount ?? 0;
  const due = Math.max(0, total - paid);

  // Patient-wide payment history assembled from OPD visits and module bills.
  // Falls back to the current visit alone while history is still loading.
  const opdVisits =
    history?.opd && history.opd.length > 0 ? history.opd : [visit];
  const rows: PaymentRow[] = [
    ...opdVisits
      .filter((v) => (v.paidAmount ?? 0) > 0)
      .map((v) => ({
        id: `opd-${v._id}`,
        date: v.visitDate || v.createdAt,
        module: "OPD",
        reference: `OPDN${String(v.opdNumber).padStart(4, "0")}`,
        mode: v.paymentMode,
        amount: v.paidAmount ?? 0,
        isCurrentVisit: v._id === visit._id,
      })),
    ...(history?.pharmacy ?? [])
      .filter((b) => (b.paidAmount ?? 0) > 0)
      .map((b) => ({
        id: `pharmacy-${b._id}`,
        date: b.createdAt,
        module: "Pharmacy",
        reference: `Bill #${b.billNumber}`,
        mode: b.paymentMode,
        amount: b.paidAmount ?? 0,
      })),
    ...(history?.pathology ?? [])
      .filter((b) => (b.paidAmount ?? 0) > 0)
      .map((b) => ({
        id: `pathology-${b._id}`,
        date: b.billDate || b.createdAt,
        module: "Pathology",
        reference: b.billNo,
        mode: b.paymentMode,
        amount: b.paidAmount ?? 0,
      })),
    ...(history?.radiology ?? [])
      .filter((b) => (b.paidAmount ?? 0) > 0)
      .map((b) => ({
        id: `radiology-${b._id}`,
        date: b.billDate || b.createdAt,
        module: "Radiology",
        reference: b.billNo,
        mode: b.paymentMode,
        amount: b.paidAmount ?? 0,
      })),
  ].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  const columns: ColumnDef<PaymentRow>[] = [
    {
      key: "date",
      header: "Date",
      sortable: true,
      sortValue: (r) => r.date ?? "",
      width: "w-28",
      render: (r) => (
        <span className="text-xs text-gray-700">
          {r.date ? formatDate(r.date) : "—"}
        </span>
      ),
      csvValue: (r) => (r.date ? formatDate(r.date) : ""),
    },
    {
      key: "module",
      header: "Module",
      accessor: "module",
      sortable: true,
      render: (r) => <span className="text-xs text-gray-700">{r.module}</span>,
    },
    {
      key: "reference",
      header: "Reference",
      accessor: "reference",
      sortable: true,
      render: (r) => (
        <span className="text-xs font-medium text-gray-900 whitespace-nowrap">
          {r.reference}
          {r.isCurrentVisit && (
            <span className="ml-1.5 text-2xs font-semibold text-primary-600">
              (this visit)
            </span>
          )}
        </span>
      ),
      csvValue: (r) => r.reference,
    },
    {
      key: "mode",
      header: "Payment Mode",
      accessor: "mode",
      render: (r) => (
        <span className="text-xs text-gray-700">{r.mode || "—"}</span>
      ),
      csvValue: (r) => r.mode ?? "",
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      sortable: true,
      sortValue: (r) => r.amount,
      render: (r) => (
        <span className="text-xs font-semibold text-gray-900">
          {fmt(r.amount)}
        </span>
      ),
      csvValue: (r) => String(r.amount),
    },
  ];

  return (
    <div className="p-4 space-y-4">
      {/* This visit's summary */}
      <h2 className="text-sm font-semibold text-gray-800">This Visit</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="border border-gray-200 rounded-lg bg-white p-4">
          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            Total Amount
          </h3>
          <p className="text-lg font-bold text-gray-900 mt-1">{fmt(total)}</p>
        </div>
        <div className="border border-gray-200 rounded-lg bg-white p-4">
          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            Paid
          </h3>
          <p className="text-lg font-bold text-success-700 mt-1">{fmt(paid)}</p>
          <p className="text-2xs text-gray-400 mt-0.5">
            {visit.paymentMode ? `via ${visit.paymentMode}` : ""}
          </p>
        </div>
        <div className="border border-gray-200 rounded-lg bg-white p-4">
          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            Due
          </h3>
          <p
            className={`text-lg font-bold mt-1 ${due > 0 ? "text-danger-600" : "text-gray-900"}`}
          >
            {fmt(due)}
          </p>
          {due === 0 && (
            <Badge className="mt-1 bg-success-100 text-success-700 border-0 text-2xs">
              Fully Paid
            </Badge>
          )}
        </div>
      </div>

      {/* Payment history */}
      <h2 className="text-sm font-semibold text-gray-800">Payment History</h2>
      <DataTable
        columns={columns}
        data={rows}
        rowKey={(r) => r.id}
        emptyText="No payments recorded for this patient."
        wrapperClassName="rounded-lg"
        downloadable
        printable
        fileName="Payment History"
      />
    </div>
  );
}
