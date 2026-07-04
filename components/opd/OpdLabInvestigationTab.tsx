"use client";

import { useCurrency } from "@/lib/context";
import { formatDate } from "@/lib/format";
import type { OpdPatientHistory, OpdPrescription } from "./types";

export function OpdLabInvestigationTab({
  history,
  prescription,
}: {
  history: OpdPatientHistory | null;
  prescription: OpdPrescription | null;
}) {
  const { fmt } = useCurrency();

  const rows = [
    ...(history?.pathology ?? []).flatMap((b) =>
      b.items.map((it) => ({ ...it, lab: "Pathology", billNo: b.billNo })),
    ),
    ...(history?.radiology ?? []).flatMap((b) =>
      b.items.map((it) => ({ ...it, lab: "Radiology", billNo: b.billNo })),
    ),
  ];

  const suggested = [
    prescription?.pathology
      ? `Pathology: ${prescription.pathology}`
      : null,
    prescription?.radiology
      ? `Radiology: ${prescription.radiology}`
      : null,
  ].filter(Boolean);

  const th =
    "text-left text-2xs font-semibold text-gray-400 uppercase tracking-wide px-3 py-2 whitespace-nowrap";
  const td = "px-3 py-2 text-xs text-gray-700 whitespace-nowrap";

  return (
    <div className="p-4 space-y-4">
      {suggested.length > 0 && (
        <div className="border border-primary-100 bg-primary-50/50 rounded-lg p-3">
          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
            Suggested in Prescription
          </h3>
          {suggested.map((s, i) => (
            <p key={i} className="text-xs text-gray-700">
              {s}
            </p>
          ))}
        </div>
      )}

      <div className="border border-gray-200 rounded-lg bg-white overflow-x-auto">
        {rows.length === 0 ? (
          <p className="p-6 text-center text-xs text-gray-400">
            No lab tests found for this patient.
          </p>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className={th}>Test Name</th>
                <th className={th}>Lab</th>
                <th className={th}>Bill No</th>
                <th className={th}>Report Date</th>
                <th className={`${th} text-right`}>Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className={`${td} font-medium text-gray-900`}>
                    {r.testName}
                  </td>
                  <td className={td}>{r.lab}</td>
                  <td className={td}>{r.billNo}</td>
                  <td className={td}>
                    {r.reportDate ? formatDate(r.reportDate) : "—"}
                  </td>
                  <td className={`${td} text-right`}>
                    {r.amount != null ? fmt(r.amount) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
