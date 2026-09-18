"use client";

import { ReportTable, type ReportTableControls } from "./ReportTable";
import { useDateFormatter } from "@/lib/context";
import type { ColumnDef } from "@/components/ui/data-table";
import type { BillRow } from "./types";

function billDateOf(r: BillRow): string | undefined {
  return r.billDate ?? r.createdAt;
}

export function BillReportTable({
  title,
  rows,
  total,
  totalPaid,
  totalBalance,
  fmt,
  controls,
}: {
  title: string;
  rows: BillRow[];
  /** Range-wide totals from the API — `rows` only holds the current page. */
  total: number;
  totalPaid: number;
  totalBalance: number;
  fmt: (n: number) => string;
  controls: ReportTableControls<BillRow>;
}) {
  const { formatDate } = useDateFormatter();

  const fmtBillDate = (r: BillRow) => {
    const d = billDateOf(r);
    return d ? formatDate(d.split("T")[0]) : "—";
  };

  const columns: ColumnDef<BillRow>[] = [
    {
      key: "date",
      header: "Date",
      sortable: true,
      render: fmtBillDate,
      csvValue: fmtBillDate,
    },
    {
      key: "billNo",
      header: "Bill No",
      sortable: true,
      render: (r) => (
        <span className="font-mono text-2xs">{r.billNo ?? "—"}</span>
      ),
      csvValue: (r) => r.billNo ?? "—",
    },
    {
      key: "patient",
      header: "Patient",
      render: (r) => (
        <div>
          <div className="font-medium">{r.patientId?.name ?? "—"}</div>
          {r.patientId?.uhid && (
            <div className="text-gray-400">{r.patientId.uhid}</div>
          )}
        </div>
      ),
      csvValue: (r) =>
        r.patientId
          ? `${r.patientId.name}${r.patientId.uhid ? ` (${r.patientId.uhid})` : ""}`
          : "—",
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      sortable: true,
      render: (r) => fmt(r.amount),
      csvValue: (r) => String(r.amount ?? 0),
    },
    {
      key: "discount",
      header: "Discount",
      align: "right",
      render: (r) => (
        <span className="text-warning-600">
          {r.discountAmount ? fmt(r.discountAmount) : "—"}
        </span>
      ),
      csvValue: (r) => String(r.discountAmount ?? 0),
    },
    {
      key: "net",
      header: "Net",
      align: "right",
      sortable: true,
      render: (r) => fmt(r.netAmount),
      csvValue: (r) => String(r.netAmount ?? 0),
    },
    {
      key: "paid",
      header: "Paid",
      align: "right",
      sortable: true,
      render: (r) => (
        <span className="text-success-700">{fmt(r.paidAmount)}</span>
      ),
      csvValue: (r) => String(r.paidAmount ?? 0),
    },
    {
      key: "balance",
      header: "Balance",
      align: "right",
      render: (r) => (
        <span className="text-danger-600">
          {(r.balance ?? 0) > 0 ? fmt(r.balance!) : "—"}
        </span>
      ),
      csvValue: (r) => String(r.balance ?? 0),
    },
    {
      key: "mode",
      header: "Mode",
      render: (r) => (
        <span className="capitalize">{r.paymentMode ?? "Cash"}</span>
      ),
      csvValue: (r) => r.paymentMode ?? "Cash",
    },
    {
      key: "by",
      header: "By",
      render: (r) => r.createdBy?.name ?? "—",
      csvValue: (r) => r.createdBy?.name ?? "—",
    },
  ];

  return (
    <ReportTable
      title={title}
      footer={`${total} bills · Paid: ${fmt(totalPaid)} · Balance: ${fmt(totalBalance)}`}
      columns={columns}
      data={rows}
      rowKey={(r) => r._id}
      total={total}
      controls={controls}
      itemLabel="bills"
    />
  );
}
