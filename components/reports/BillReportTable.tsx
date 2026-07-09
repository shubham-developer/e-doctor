"use client";

import { ReportTable } from "./ReportTable";
import type { BillRow } from "./types";

export function BillReportTable({
  title,
  rows,
  fmt,
}: {
  title: string;
  rows: BillRow[];
  fmt: (n: number) => string;
}) {
  const totalPaid = rows.reduce((s, r) => s + (r.paidAmount ?? 0), 0);
  const totalBal = rows.reduce((s, r) => s + (r.balance ?? (r.netAmount - r.paidAmount)), 0);
  return (
    <ReportTable
      title={title}
      empty={rows.length === 0}
      footer={`${rows.length} bills · Paid: ${fmt(totalPaid)} · Balance: ${fmt(totalBal)}`}
      headers={["Date", "Bill No", "Patient", "Amount", "Discount", "Net", "Paid", "Balance", "Mode", "By"]}
    >
      {rows.map((r) => (
        <tr key={r._id} className="hover:bg-gray-50">
          <td className="px-4 py-2">{r.billDate ?? (r as {createdAt?: string}).createdAt?.slice(0, 10) ?? "—"}</td>
          <td className="px-4 py-2 font-mono text-2xs">{r.billNo ?? "—"}</td>
          <td className="px-4 py-2">
            <div className="font-medium">{r.patientId?.name ?? "—"}</div>
            {r.patientId?.uhid && <div className="text-gray-400">{r.patientId.uhid}</div>}
          </td>
          <td className="px-4 py-2 text-right">{fmt(r.amount)}</td>
          <td className="px-4 py-2 text-right text-warning-600">
            {r.discountAmount ? fmt(r.discountAmount) : "—"}
          </td>
          <td className="px-4 py-2 text-right">{fmt(r.netAmount)}</td>
          <td className="px-4 py-2 text-right text-success-700">{fmt(r.paidAmount)}</td>
          <td className="px-4 py-2 text-right text-danger-600">{(r.balance ?? 0) > 0 ? fmt(r.balance!) : "—"}</td>
          <td className="px-4 py-2 capitalize">{r.paymentMode ?? "Cash"}</td>
          <td className="px-4 py-2">{r.createdBy?.name ?? "—"}</td>
        </tr>
      ))}
    </ReportTable>
  );
}
