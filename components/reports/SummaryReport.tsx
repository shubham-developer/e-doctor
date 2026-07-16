"use client";

import { StatCard } from "@/components/common/StatCard";
import { useDateFormatter } from "@/lib/context";
import type { ReportSummary } from "./types";

export function SummaryReport({
  summary,
  fmt,
}: {
  summary: ReportSummary;
  fmt: (n: number) => string;
}) {
  const { formatDate } = useDateFormatter();
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          label="OPD Visits"
          color="primary"
          value={summary.opd.count.toString()}
          sub={
            (summary.opd.freeRevisitCount ?? 0) > 0
              ? `${summary.opd.freeRevisitCount} free revisit${summary.opd.freeRevisitCount !== 1 ? "s" : ""} · ${fmt(summary.opd.amount)}`
              : fmt(summary.opd.amount)
          }
        />
        <StatCard
          label="IPD Admissions"
          color="purple"
          value={summary.ipd.admissions.toString()}
          sub={fmt(summary.ipd.payments)}
        />
        <StatCard
          label="Pharmacy Income"
          color="success"
          value={fmt(summary.pharmacy.paid)}
          sub={`${summary.pharmacy.count} bills`}
        />
        <StatCard
          label="Pathology Income"
          color="warning"
          value={fmt(summary.pathology.paid)}
          sub={`${summary.pathology.count} bills`}
        />
        <StatCard
          label="Radiology Income"
          color="danger"
          value={fmt(summary.radiology.paid)}
          sub={`${summary.radiology.count} bills`}
        />
        <StatCard
          label="Total Income"
          color="teal"
          bold
          value={fmt(summary.total)}
          sub="all modules"
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            Income Breakdown
          </h3>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-500 border-b border-gray-100">
              <th className="text-left px-4 py-2">Module</th>
              <th className="text-right px-4 py-2">Count</th>
              <th className="text-right px-4 py-2">Gross</th>
              <th className="text-right px-4 py-2">Collected</th>
              <th className="text-right px-4 py-2">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            <tr className="hover:bg-gray-50">
              <td className="px-4 py-2 font-medium text-primary-700">OPD</td>
              <td className="text-right px-4 py-2">
                {summary.opd.count}
                {(summary.opd.freeRevisitCount ?? 0) > 0 && (
                  <span className="ml-1.5 text-green-600 text-2xs">
                    ({summary.opd.freeRevisitCount} free revisit
                    {summary.opd.freeRevisitCount !== 1 ? "s" : ""})
                  </span>
                )}
                {(summary.opd.paidRevisitCount ?? 0) > 0 && (
                  <span className="ml-1.5 text-amber-600 text-2xs">
                    ({summary.opd.paidRevisitCount} charged revisit
                    {summary.opd.paidRevisitCount !== 1 ? "s" : ""})
                  </span>
                )}
              </td>
              <td className="text-right px-4 py-2">
                {fmt(summary.opd.amount)}
              </td>
              <td className="text-right px-4 py-2 text-success-700">
                {fmt(summary.opd.amount)}
              </td>
              <td className="text-right px-4 py-2">—</td>
            </tr>
            <tr className="hover:bg-gray-50">
              <td className="px-4 py-2 font-medium text-purple-700">IPD</td>
              <td className="text-right px-4 py-2">
                {summary.ipd.admissions} adm / {summary.ipd.discharges} dis
              </td>
              <td className="text-right px-4 py-2">—</td>
              <td className="text-right px-4 py-2 text-success-700">
                {fmt(summary.ipd.payments)}
              </td>
              <td className="text-right px-4 py-2">—</td>
            </tr>
            <tr className="hover:bg-gray-50">
              <td className="px-4 py-2 font-medium text-success-700">
                Pharmacy
              </td>
              <td className="text-right px-4 py-2">{summary.pharmacy.count}</td>
              <td className="text-right px-4 py-2">
                {fmt(summary.pharmacy.amount)}
              </td>
              <td className="text-right px-4 py-2 text-success-700">
                {fmt(summary.pharmacy.paid)}
              </td>
              <td className="text-right px-4 py-2 text-danger-600">
                {fmt(summary.pharmacy.balance)}
              </td>
            </tr>
            <tr className="hover:bg-gray-50">
              <td className="px-4 py-2 font-medium text-warning-700">
                Pathology
              </td>
              <td className="text-right px-4 py-2">
                {summary.pathology.count}
              </td>
              <td className="text-right px-4 py-2">
                {fmt(summary.pathology.amount)}
              </td>
              <td className="text-right px-4 py-2 text-success-700">
                {fmt(summary.pathology.paid)}
              </td>
              <td className="text-right px-4 py-2 text-danger-600">
                {fmt(summary.pathology.balance)}
              </td>
            </tr>
            <tr className="hover:bg-gray-50">
              <td className="px-4 py-2 font-medium text-danger-700">
                Radiology
              </td>
              <td className="text-right px-4 py-2">
                {summary.radiology.count}
              </td>
              <td className="text-right px-4 py-2">
                {fmt(summary.radiology.amount)}
              </td>
              <td className="text-right px-4 py-2 text-success-700">
                {fmt(summary.radiology.paid)}
              </td>
              <td className="text-right px-4 py-2 text-danger-600">
                {fmt(summary.radiology.balance)}
              </td>
            </tr>
            <tr className="bg-gray-50 font-semibold">
              <td className="px-4 py-2 text-gray-800">TOTAL</td>
              <td className="text-right px-4 py-2">—</td>
              <td className="text-right px-4 py-2">—</td>
              <td className="text-right px-4 py-2 text-success-800">
                {fmt(summary.total)}
              </td>
              <td className="text-right px-4 py-2">—</td>
            </tr>
          </tbody>
        </table>
      </div>

      {summary.paymentModes.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              Payment Mode Breakdown
            </h3>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500 border-b border-gray-100">
                <th className="text-left px-4 py-2">Mode</th>
                <th className="text-right px-4 py-2">Transactions</th>
                <th className="text-right px-4 py-2">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {summary.paymentModes.map((m) => (
                <tr key={m.mode} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium capitalize">
                    {m.mode || "Cash"}
                  </td>
                  <td className="text-right px-4 py-2">{m.count}</td>
                  <td className="text-right px-4 py-2 text-success-700">
                    {fmt(m.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {summary.daily.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              Daily Income Trend
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[560px]">
              <thead>
                <tr className="text-gray-500 border-b border-gray-100">
                  <th className="text-left px-4 py-2">Date</th>
                  <th className="text-right px-4 py-2">OPD</th>
                  <th className="text-right px-4 py-2">IPD</th>
                  <th className="text-right px-4 py-2">Pharmacy</th>
                  <th className="text-right px-4 py-2">Pathology</th>
                  <th className="text-right px-4 py-2">Radiology</th>
                  <th className="text-right px-4 py-2 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {summary.daily.map((d) => (
                  <tr key={d.date} className="hover:bg-gray-50">
                    <td className="px-4 py-1.5 font-medium">
                      {formatDate(d.date)}
                    </td>
                    <td className="text-right px-4 py-1.5">
                      {d.opd ? fmt(d.opd) : "—"}
                    </td>
                    <td className="text-right px-4 py-1.5">
                      {d.ipd ? fmt(d.ipd) : "—"}
                    </td>
                    <td className="text-right px-4 py-1.5">
                      {d.pharmacy ? fmt(d.pharmacy) : "—"}
                    </td>
                    <td className="text-right px-4 py-1.5">
                      {d.pathology ? fmt(d.pathology) : "—"}
                    </td>
                    <td className="text-right px-4 py-1.5">
                      {d.radiology ? fmt(d.radiology) : "—"}
                    </td>
                    <td className="text-right px-4 py-1.5 font-semibold text-success-700">
                      {fmt(d.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
