"use client";

import { formatDate } from "@/lib/format";
import type { OpdPrescription } from "./types";

export function OpdMedicationTab({
  prescriptions,
  currentVisitId,
}: {
  prescriptions: OpdPrescription[];
  currentVisitId: string;
}) {
  const th =
    "text-left text-2xs font-semibold text-gray-400 uppercase tracking-wide px-3 py-2 whitespace-nowrap";
  const td = "px-3 py-2 text-xs text-gray-700";

  // One row per medicine across all of the patient's prescriptions (newest first).
  const rows = prescriptions.flatMap((p) =>
    p.medicines.map((m) => ({ ...m, date: p.createdAt })),
  );

  const current = prescriptions.find((p) => p.opdVisitId === currentVisitId);

  if (rows.length === 0) {
    return (
      <div className="p-4">
        <div className="border border-gray-200 rounded-lg bg-white p-6 text-center text-xs text-gray-400">
          No medication recorded for this patient.
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="border border-gray-200 rounded-lg bg-white overflow-x-auto">
        <div className="px-3 py-2 border-b border-gray-200 bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-800">Medication</h2>
        </div>
        <table className="w-full">
          <thead className="border-b border-gray-200">
            <tr>
              <th className={th}>Date</th>
              <th className={th}>Category</th>
              <th className={th}>Medicine</th>
              <th className={th}>Dose</th>
              <th className={th}>Dose Interval</th>
              <th className={th}>Dose Duration</th>
              <th className={th}>Instruction</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((m, i) => (
              <tr key={i}>
                <td className={`${td} whitespace-nowrap`}>
                  {formatDate(m.date)}
                </td>
                <td className={td}>{m.category || "—"}</td>
                <td className={`${td} font-medium text-gray-900`}>{m.name}</td>
                <td className={td}>{m.dose || "—"}</td>
                <td className={td}>{m.doseInterval || "—"}</td>
                <td className={td}>{m.doseDuration || "—"}</td>
                <td className={td}>{m.instruction || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {current && current.findings.length > 0 && (
        <div className="border border-gray-200 rounded-lg bg-white overflow-x-auto">
          <div className="px-3 py-2 border-b border-gray-200 bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-800">
              Findings (this visit)
            </h2>
          </div>
          <table className="w-full">
            <thead className="border-b border-gray-200">
              <tr>
                <th className={th}>Category</th>
                <th className={th}>Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {current.findings.map((f, i) => (
                <tr key={i}>
                  <td className={td}>{f.category || "—"}</td>
                  <td className={td}>{f.description || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
