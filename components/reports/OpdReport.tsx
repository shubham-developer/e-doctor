"use client";

import { ReportTable } from "./ReportTable";
import type { OpdVisit } from "./types";

export function OpdReport({ rows, fmt }: { rows: OpdVisit[]; fmt: (n: number) => string }) {
  return (
    <ReportTable
      title="OPD Report"
      empty={rows.length === 0}
      footer={`${rows.length} visits · Total: ${fmt(rows.reduce((s, r) => s + (r.paidAmount || 0), 0))}`}
      headers={["Date", "Patient", "Age / Gender", "Doctor", "Visit Type", "Payment Mode", "Amount"]}
    >
      {rows.map((r) => (
        <tr key={r._id} className="hover:bg-gray-50">
          <td className="px-4 py-2">{r.visitDate}</td>
          <td className="px-4 py-2">
            <div className="font-medium">{r.patientId?.name ?? "—"}</div>
            {r.patientId?.uhid && <div className="text-gray-400">{r.patientId.uhid}</div>}
          </td>
          <td className="px-4 py-2">
            {r.patientId?.age ?? "—"} / {r.patientId?.gender ?? "—"}
          </td>
          <td className="px-4 py-2">{r.doctorId?.name ?? "—"}</td>
          <td className="px-4 py-2 capitalize">{r.visitType ?? "—"}</td>
          <td className="px-4 py-2 capitalize">{r.paymentMode ?? "Cash"}</td>
          <td className="px-4 py-2 text-right text-success-700">{fmt(r.paidAmount)}</td>
        </tr>
      ))}
    </ReportTable>
  );
}
