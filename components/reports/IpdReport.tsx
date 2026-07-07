"use client";

import { ReportTable } from "./ReportTable";
import { formatDate } from "@/lib/format";
import type { IpdAdm } from "./types";

export function IpdReport({
  ipdRows,
  fmt,
}: {
  ipdRows: {
    admissions: IpdAdm[];
    paidByIpd: Record<string, number>;
    chargesByIpd: Record<string, number>;
  };
  fmt: (n: number) => string;
}) {
  const admissions = ipdRows?.admissions ?? [];
  const paidByIpd = ipdRows?.paidByIpd ?? {};
  const chargesByIpd = ipdRows?.chargesByIpd ?? {};
  const totalPaid = Object.values(paidByIpd).reduce((s, v) => s + v, 0);
  const totalCharges = Object.values(chargesByIpd).reduce((s, v) => s + v, 0);

  return (
    <ReportTable
      title="IPD Report"
      empty={admissions.length === 0}
      footer={`${admissions.length} admissions · Charges: ${fmt(totalCharges)} · Paid: ${fmt(totalPaid)} · Balance: ${fmt(totalCharges - totalPaid)}`}
      headers={[
        "IPD No",
        "Admission Date",
        "Patient",
        "Doctor",
        "Bed",
        "Status",
        "Discharge Date",
        "Total Charges",
        "Paid",
        "Balance",
      ]}
    >
      {admissions.map((r) => {
        const paid = paidByIpd[r._id] ?? 0;
        const charges = chargesByIpd[r._id] ?? 0;
        const balance = charges - paid;
        const isDischarge = r.status?.toUpperCase() === "DISCHARGED";

        return (
          <tr key={r._id} className="hover:bg-gray-50">
            <td className="px-4 py-2 font-mono text-2xs text-gray-500">
              {r.ipdNumber ?? "—"}
            </td>
            <td className="px-4 py-2">{formatDate(r.admissionDate.split("T")[0])}</td>
            <td className="px-4 py-2">
              <div className="font-medium">{r.patientId?.name ?? "—"}</div>
              {r.patientId?.patientCode && (
                <div className="text-gray-400 text-2xs">{r.patientId.patientCode}</div>
              )}
              {r.patientId?.phone && (
                <div className="text-gray-400 text-2xs">{r.patientId.phone}</div>
              )}
            </td>
            <td className="px-4 py-2">
              <div>{r.doctorId?.name ?? "—"}</div>
              {r.doctorId?.specialization && (
                <div className="text-gray-400 text-2xs">{r.doctorId.specialization}</div>
              )}
            </td>
            <td className="px-4 py-2 text-gray-600">
              {r.bedGroup && r.bedNumber
                ? `${r.bedGroup} / ${r.bedNumber}`
                : r.bedNumber ?? r.bedGroup ?? "—"}
            </td>
            <td className="px-4 py-2">
              <span
                className={`px-1.5 py-0.5 rounded text-2xs font-medium ${
                  isDischarge
                    ? "bg-success-100 text-success-700"
                    : "bg-primary-100 text-primary-700"
                }`}
              >
                {isDischarge ? "Discharged" : "Admitted"}
              </span>
            </td>
            <td className="px-4 py-2">{r.dischargeDate ? formatDate(r.dischargeDate.split("T")[0]) : "—"}</td>
            <td className="px-4 py-2 text-right">{charges > 0 ? fmt(charges) : "—"}</td>
            <td className="px-4 py-2 text-right text-success-700">
              {paid > 0 ? fmt(paid) : "—"}
            </td>
            <td className="px-4 py-2 text-right">
              {balance > 0 ? (
                <span className="text-danger-600">{fmt(balance)}</span>
              ) : balance < 0 ? (
                <span className="text-primary-600">{fmt(Math.abs(balance))} adv</span>
              ) : (
                <span className="text-success-600">Settled</span>
              )}
            </td>
          </tr>
        );
      })}
    </ReportTable>
  );
}
