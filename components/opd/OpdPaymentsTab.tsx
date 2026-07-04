"use client";

import { useCurrency } from "@/lib/context";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import type { OpdVisitDetail, OpdPatientHistory } from "./types";

export function OpdPaymentsTab({
  visit,
  history,
}: {
  visit: OpdVisitDetail;
  history: OpdPatientHistory | null;
}) {
  const { fmt } = useCurrency();

  const total = visit.totalFee ?? 0;
  const paid = visit.paidAmount ?? 0;
  const due = Math.max(0, total - paid);

  // Patient-wide payment history assembled from OPD visits and module bills.
  const rows = [
    ...(history?.opd ?? [])
      .filter((v) => (v.paidAmount ?? 0) > 0)
      .map((v) => ({
        date: v.visitDate || v.createdAt,
        module: "OPD",
        reference: `OPDN${String(v.opdNumber).padStart(4, "0")}`,
        mode: v.paymentMode,
        amount: v.paidAmount ?? 0,
      })),
    ...(history?.pharmacy ?? [])
      .filter((b) => (b.paidAmount ?? 0) > 0)
      .map((b) => ({
        date: b.createdAt,
        module: "Pharmacy",
        reference: `Bill #${b.billNumber}`,
        mode: b.paymentMode,
        amount: b.paidAmount ?? 0,
      })),
    ...(history?.pathology ?? [])
      .filter((b) => (b.paidAmount ?? 0) > 0)
      .map((b) => ({
        date: b.billDate || b.createdAt,
        module: "Pathology",
        reference: b.billNo,
        mode: b.paymentMode,
        amount: b.paidAmount ?? 0,
      })),
    ...(history?.radiology ?? [])
      .filter((b) => (b.paidAmount ?? 0) > 0)
      .map((b) => ({
        date: b.billDate || b.createdAt,
        module: "Radiology",
        reference: b.billNo,
        mode: b.paymentMode,
        amount: b.paidAmount ?? 0,
      })),
  ].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  const th =
    "text-left text-2xs font-semibold text-gray-400 uppercase tracking-wide px-3 py-2 whitespace-nowrap";
  const td = "px-3 py-2 text-xs text-gray-700 whitespace-nowrap";

  return (
    <div className="p-4 space-y-4">
      {/* This visit's summary */}
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
      <div className="border border-gray-200 rounded-lg bg-white overflow-x-auto">
        <div className="px-3 py-2 border-b border-gray-200 bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-800">
            Payment History
          </h2>
        </div>
        {rows.length === 0 ? (
          <p className="p-6 text-center text-xs text-gray-400">
            No payments recorded for this patient.
          </p>
        ) : (
          <table className="w-full">
            <thead className="border-b border-gray-200">
              <tr>
                <th className={th}>Date</th>
                <th className={th}>Module</th>
                <th className={th}>Reference</th>
                <th className={th}>Payment Mode</th>
                <th className={`${th} text-right`}>Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className={td}>{r.date ? formatDate(r.date) : "—"}</td>
                  <td className={td}>{r.module}</td>
                  <td className={`${td} font-medium text-gray-900`}>
                    {r.reference}
                  </td>
                  <td className={td}>{r.mode || "—"}</td>
                  <td className={`${td} text-right`}>{fmt(r.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
