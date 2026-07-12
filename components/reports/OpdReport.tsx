"use client";

import { ReportTable } from "./ReportTable";
import type { OpdVisit } from "./types";

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  new:          { label: "New",           cls: "bg-primary-100 text-primary-700" },
  free_revisit: { label: "Free Revisit",  cls: "bg-green-100 text-green-700" },
  paid_revisit: { label: "Revisit",       cls: "bg-amber-100 text-amber-700" },
};

export function OpdReport({
  rows,
  freeRevisitCount,
  paidRevisitCount,
  fmt,
}: {
  rows: OpdVisit[];
  freeRevisitCount?: number;
  paidRevisitCount?: number;
  fmt: (n: number) => string;
}) {
  const freeReturning = freeRevisitCount ?? rows.filter((r) => r.visitStatus === "free_revisit").length;
  const paidReturning = paidRevisitCount ?? rows.filter((r) => r.visitStatus === "paid_revisit").length;
  const newCount = rows.length - freeReturning - paidReturning;

  return (
    <div className="space-y-3">
      {rows.length > 0 && (
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-primary-500 shrink-0" />
            <div>
              <p className="text-xs text-gray-500">New</p>
              <p className="text-lg font-bold text-gray-900">{newCount}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 bg-white border border-green-200 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Free Revisit</p>
              <p className="text-lg font-bold text-green-700">{freeReturning}</p>
            </div>
          </div>
          {paidReturning > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-white border border-amber-200 rounded-lg">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Revisit (Charged)</p>
                <p className="text-lg font-bold text-amber-700">{paidReturning}</p>
              </div>
            </div>
          )}
          {rows.length > 0 && (freeReturning + paidReturning) > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg">
              <div>
                <p className="text-xs text-gray-500">Return Rate</p>
                <p className="text-lg font-bold text-gray-700">{Math.round(((freeReturning + paidReturning) / rows.length) * 100)}%</p>
              </div>
            </div>
          )}
        </div>
      )}
      <ReportTable
        title="OPD Report"
        empty={rows.length === 0}
        footer={`${rows.length} visits · ${newCount} new · ${freeReturning} free revisit${freeReturning !== 1 ? "s" : ""}${paidReturning > 0 ? ` · ${paidReturning} charged revisit${paidReturning !== 1 ? "s" : ""}` : ""} · Total: ${fmt(rows.reduce((s, r) => s + (r.paidAmount || 0), 0))}`}
        headers={["Date", "Patient", "Age / Gender", "Doctor", "Type", "Payment Mode", "Amount"]}
      >
        {rows.map((r) => {
          const status = r.visitStatus ?? (r.isReturning ? "free_revisit" : "new");
          const badge = STATUS_BADGE[status] ?? STATUS_BADGE.new;
          return (
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
              <td className="px-4 py-2">
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-medium ${badge.cls}`}>
                  {badge.label}
                </span>
              </td>
              <td className="px-4 py-2 capitalize">{r.paymentMode ?? "Cash"}</td>
              <td className="px-4 py-2 text-right text-success-700">{fmt(r.paidAmount)}</td>
            </tr>
          );
        })}
      </ReportTable>
    </div>
  );
}
