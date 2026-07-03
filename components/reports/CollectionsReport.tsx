"use client";

import { Printer } from "lucide-react";
import { useApp } from "@/lib/context";
import type { CollectionsData } from "./types";

export function CollectionsReport({
  collectionsData,
  from,
  to,
  fmt,
}: {
  collectionsData: CollectionsData;
  from: string;
  to: string;
  fmt: (n: number) => string;
}) {
  const { tenant } = useApp();

  return (
    <div className="space-y-4">
      <div className="hidden print:block mb-2">
        <h2 className="text-sm font-semibold text-gray-800">Payment Collection Report</h2>
        <p className="text-xs text-gray-500">
          {tenant?.name} · {from === to ? from : `${from} — ${to}`}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="bg-teal-600 text-white rounded-lg px-4 py-3 min-w-[140px]">
          <div className="text-2xs uppercase tracking-wide opacity-80 font-medium">
            Total Collection
          </div>
          <div className="text-lg font-bold mt-0.5">{fmt(collectionsData.grandTotal)}</div>
          <div className="text-2xs opacity-70">{collectionsData.grandCount} transactions</div>
        </div>
        {collectionsData.allModes.map((m) => (
          <div key={m} className="bg-white border border-gray-200 rounded-lg px-4 py-3 min-w-[120px]">
            <div className="text-2xs uppercase tracking-wide text-gray-500 font-medium">{m}</div>
            <div className="text-sm font-bold text-gray-900 mt-0.5">
              {fmt(collectionsData.modeTotals[m] ?? 0)}
            </div>
            <div className="text-2xs text-gray-400">{collectionsData.modeCounts[m] ?? 0} txns</div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            Staff-wise Payment Breakdown
          </h3>
          <button
            onClick={() => window.print()}
            className="print:hidden flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors"
          >
            <Printer className="w-3 h-3" />
            Print
          </button>
        </div>

        {collectionsData.collections.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-gray-400">No collections for this period</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500 border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-2 sticky left-0 bg-gray-50">#</th>
                  <th className="text-left px-4 py-2 sticky left-6 bg-gray-50 min-w-[140px]">Staff Name</th>
                  {collectionsData.allModes.map((m) => (
                    <th key={m} className="text-right px-4 py-2 whitespace-nowrap">
                      <div>{m}</div>
                      <div className="text-2xs text-gray-400 font-normal">amount / txns</div>
                    </th>
                  ))}
                  <th className="text-right px-4 py-2 font-semibold text-gray-700 whitespace-nowrap">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {collectionsData.collections.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-400">{i + 1}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-900">{r.name}</td>
                    {collectionsData.allModes.map((m) => (
                      <td key={m} className="px-4 py-2.5 text-right">
                        {r.modeAmounts[m] ? (
                          <div>
                            <div className="font-medium text-gray-800">{fmt(r.modeAmounts[m])}</div>
                            <div className="text-2xs text-gray-400">{r.modeCounts[m]} txns</div>
                          </div>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-2.5 text-right font-bold text-success-700">{fmt(r.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-teal-50 border-t-2 border-teal-200 font-semibold text-teal-800">
                  <td className="px-4 py-2.5" colSpan={2}>
                    TOTAL
                  </td>
                  {collectionsData.allModes.map((m) => (
                    <td key={m} className="px-4 py-2.5 text-right">
                      <div>{fmt(collectionsData.modeTotals[m] ?? 0)}</div>
                      <div className="text-2xs font-normal text-teal-600">
                        {collectionsData.modeCounts[m] ?? 0} txns
                      </div>
                    </td>
                  ))}
                  <td className="px-4 py-2.5 text-right font-bold text-teal-900">
                    {fmt(collectionsData.grandTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
