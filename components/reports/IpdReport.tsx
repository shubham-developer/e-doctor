"use client";

import { ReportTable } from "./ReportTable";
import type { IpdAdm } from "./types";

export function IpdReport({
  ipdRows,
  fmt,
}: {
  ipdRows: { admissions: IpdAdm[]; paidByIpd: Record<string, number> };
  fmt: (n: number) => string;
}) {
  return (
    <ReportTable
      title="IPD Report"
      empty={ipdRows.admissions.length === 0}
      footer={`${ipdRows.admissions.length} admissions · Total Paid: ${fmt(
        Object.values(ipdRows.paidByIpd).reduce((s, v) => s + v, 0),
      )}`}
      headers={["Admission Date", "Patient", "Doctor", "Status", "Discharge Date", "Total Paid"]}
    >
      {ipdRows.admissions.map((r) => (
        <tr key={r._id} className="hover:bg-gray-50">
          <td className="px-4 py-2">{r.admissionDate}</td>
          <td className="px-4 py-2">
            <div className="font-medium">{r.patientId?.name ?? "—"}</div>
            {r.patientId?.patientCode && <div className="text-gray-400">{r.patientId.patientCode}</div>}
          </td>
          <td className="px-4 py-2">{r.doctorId?.name ?? "—"}</td>
          <td className="px-4 py-2">
            <span
              className={`px-1.5 py-0.5 rounded text-2xs font-medium ${
                r.status === "discharged" ? "bg-success-100 text-success-700" : "bg-primary-100 text-primary-700"
              }`}
            >
              {r.status ?? "admitted"}
            </span>
          </td>
          <td className="px-4 py-2">{r.dischargeDate ?? "—"}</td>
          <td className="px-4 py-2 text-right text-success-700">{fmt(ipdRows.paidByIpd[r._id] ?? 0)}</td>
        </tr>
      ))}
    </ReportTable>
  );
}
