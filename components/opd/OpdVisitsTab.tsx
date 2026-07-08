"use client";

import { useRouter } from "next/navigation";
import { useCurrency, useDateFormatter } from "@/lib/context";
import type { OpdVisit } from "./types";

export function OpdVisitsTab({ visits }: { visits: OpdVisit[] }) {
  const router = useRouter();
  const { fmt } = useCurrency();
  const { formatDate } = useDateFormatter();

  const sorted = [...visits].sort((a, b) =>
    (b.visitDate || b.createdAt).localeCompare(a.visitDate || a.createdAt),
  );

  const th =
    "text-left text-2xs font-semibold text-gray-400 uppercase tracking-wide px-3 py-2 whitespace-nowrap";
  const td = "px-3 py-2 text-xs text-gray-700 whitespace-nowrap";

  return (
    <div className="p-4">
      <div className="border border-gray-200 rounded-lg bg-white overflow-x-auto">
        {sorted.length === 0 ? (
          <p className="p-6 text-center text-xs text-gray-400">
            No OPD visits found for this patient.
          </p>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className={th}>OPD No</th>
                <th className={th}>Appt. Date</th>
                <th className={th}>Consultant</th>
                <th className={th}>Symptoms</th>
                <th className={`${th} text-right`}>Total</th>
                <th className={`${th} text-right`}>Paid</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((v) => (
                <tr
                  key={v._id}
                  onClick={() => router.push(`/dashboard/opd/${v._id}`)}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className={`${td} font-semibold text-primary-700`}>
                    OPDN{String(v.opdNumber).padStart(4, "0")}
                  </td>
                  <td className={td}>
                    {v.visitDate ? formatDate(v.visitDate) : "—"}
                  </td>
                  <td className={td}>{v.doctorId?.name ?? "—"}</td>
                  <td className={`${td} max-w-60 truncate`}>
                    {v.chiefComplaint || "—"}
                  </td>
                  <td className={`${td} text-right`}>{fmt(v.totalFee ?? 0)}</td>
                  <td className={`${td} text-right`}>
                    {fmt(v.paidAmount ?? 0)}
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
