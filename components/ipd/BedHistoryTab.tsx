"use client";

import { BedDouble } from "lucide-react";
import type { BedHistoryEntry } from "@/components/ipd/types";

export function BedHistoryTab({ history }: { history: BedHistoryEntry[] }) {
  if (!history || history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
        <BedDouble className="w-10 h-10 opacity-20" />
        <p className="text-sm">No bed history recorded</p>
        <p className="text-xs text-gray-300">
          Bed history is tracked when a bed is assigned or changed
        </p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Bed Group
            </th>
            <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Bed
            </th>
            <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">
              From Date
            </th>
            <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">
              To Date
            </th>
            <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Active Bed
            </th>
          </tr>
        </thead>
        <tbody>
          {history.map((entry, i) => (
            <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="px-4 py-3 text-gray-700">
                {entry.bedGroup || "—"}
              </td>
              <td className="px-4 py-3 font-medium text-gray-800">
                {entry.bedNumber || "—"}
              </td>
              <td className="px-4 py-3 text-gray-500">
                {entry.fromDate
                  ? new Date(entry.fromDate).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })
                  : "—"}
              </td>
              <td className="px-4 py-3 text-gray-500">
                {entry.toDate
                  ? new Date(entry.toDate).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })
                  : "—"}
              </td>
              <td className="px-4 py-3">
                {entry.isActive ? (
                  <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-700">
                    Yes
                  </span>
                ) : (
                  <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-500">
                    No
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
