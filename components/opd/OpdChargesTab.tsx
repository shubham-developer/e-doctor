"use client";

import { useCurrency, useDateFormatter } from "@/lib/context";
import type { OpdVisitDetail } from "./types";

export function OpdChargesTab({ visit }: { visit: OpdVisitDetail }) {
  const { fmt } = useCurrency();
  const { formatDate } = useDateFormatter();

  const applied = visit.appliedCharge ?? visit.totalFee ?? 0;
  const discount = visit.discount ?? 0;
  const taxPct = visit.tax ?? 0;
  const taxAmt = ((applied - discount) * taxPct) / 100;
  const net = visit.totalFee ?? applied - discount + taxAmt;

  const th =
    "text-left text-2xs font-semibold text-gray-400 uppercase tracking-wide px-3 py-2 whitespace-nowrap";
  const td = "px-3 py-2 text-xs text-gray-700";

  return (
    <div className="p-4 space-y-4">
      <div className="border border-gray-200 rounded-lg bg-white overflow-x-auto">
        {visit.charges.length === 0 ? (
          <p className="p-6 text-center text-xs text-gray-400">
            No charges recorded for this visit.
          </p>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className={th}>#</th>
                <th className={th}>Date</th>
                <th className={th}>Charge Name</th>
                <th className={th}>Category</th>
                <th className={`${th} text-right`}>Fee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visit.charges.map((c, i) => (
                <tr key={i}>
                  <td className={td}>{i + 1}</td>
                  <td className={`${td} whitespace-nowrap`}>
                    {formatDate(visit.visitDate || visit.createdAt)}
                  </td>
                  <td className={`${td} font-medium text-gray-900`}>
                    {c.name}
                  </td>
                  <td className={td}>{c.categoryName || "—"}</td>
                  <td className={`${td} text-right`}>{fmt(c.fee)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Summary */}
      <div className="border border-gray-200 rounded-lg bg-white p-4 max-w-sm ml-auto">
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-gray-600">
            <span>Applied Charge</span>
            <span>{fmt(applied)}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-600">
            <span>Discount</span>
            <span>− {fmt(discount)}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-600">
            <span>Tax ({taxPct}%)</span>
            <span>{fmt(taxAmt)}</span>
          </div>
          <div className="flex justify-between text-sm font-semibold text-gray-900 pt-1.5 border-t border-gray-200">
            <span>Net Amount</span>
            <span>{fmt(net)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
