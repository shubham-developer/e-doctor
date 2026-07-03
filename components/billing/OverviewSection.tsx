"use client";

import { Activity, Pill, FlaskConical, Stethoscope, BedDouble } from "lucide-react";
import { StatCard } from "@/components/common/StatCard";
import type { BillingSummary } from "./types";

export function OverviewSection({
  summary,
  fmt,
}: {
  summary: BillingSummary;
  fmt: (n: number) => string;
}) {
  const rows = [
    {
      label: "OPD",
      count: summary.opd.count,
      net: summary.opd.collected,
      paid: summary.opd.collected,
      bal: 0,
      color: "text-primary-700",
    },
    {
      label: "Pharmacy",
      count: summary.pharmacy.count,
      net: summary.pharmacy.net,
      paid: summary.pharmacy.paid,
      bal: summary.pharmacy.balance,
      color: "text-success-700",
    },
    {
      label: "Pathology",
      count: summary.pathology.count,
      net: summary.pathology.net,
      paid: summary.pathology.paid,
      bal: summary.pathology.balance,
      color: "text-warning-700",
    },
    {
      label: "Radiology",
      count: summary.radiology.count,
      net: summary.radiology.net,
      paid: summary.radiology.paid,
      bal: summary.radiology.balance,
      color: "text-danger-700",
    },
    {
      label: "IPD",
      count: summary.ipd.admissions,
      net: summary.ipd.collected,
      paid: summary.ipd.collected,
      bal: 0,
      color: "text-purple-700",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard
          label="OPD"
          icon={Activity}
          color="primary"
          value={`${summary.opd.count} bills`}
          sub={`Collected: ${fmt(summary.opd.collected)}`}
        />
        <StatCard
          label="Pharmacy"
          icon={Pill}
          color="success"
          value={`${summary.pharmacy.count} bills`}
          sub={
            <>
              Collected: {fmt(summary.pharmacy.paid)}
              {summary.pharmacy.balance > 0 && (
                <div className="text-danger-600 mt-0.5">Due: {fmt(summary.pharmacy.balance)}</div>
              )}
            </>
          }
        />
        <StatCard
          label="Pathology"
          icon={FlaskConical}
          color="warning"
          value={`${summary.pathology.count} bills`}
          sub={
            <>
              Collected: {fmt(summary.pathology.paid)}
              {summary.pathology.balance > 0 && (
                <div className="text-danger-600 mt-0.5">Due: {fmt(summary.pathology.balance)}</div>
              )}
            </>
          }
        />
        <StatCard
          label="Radiology"
          icon={Stethoscope}
          color="danger"
          value={`${summary.radiology.count} bills`}
          sub={
            <>
              Collected: {fmt(summary.radiology.paid)}
              {summary.radiology.balance > 0 && (
                <div className="text-danger-600 mt-0.5">Due: {fmt(summary.radiology.balance)}</div>
              )}
            </>
          }
        />
        <StatCard
          label="IPD"
          icon={BedDouble}
          color="purple"
          value={`${summary.ipd.admissions} bills`}
          sub={`Collected: ${fmt(summary.ipd.collected)}`}
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            Billing Summary
          </h3>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-500 border-b border-gray-100">
              <th className="text-left px-4 py-2">Module</th>
              <th className="text-right px-4 py-2">Bills / Visits</th>
              <th className="text-right px-4 py-2">Net Amount</th>
              <th className="text-right px-4 py-2">Collected</th>
              <th className="text-right px-4 py-2">Balance Due</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((r) => (
              <tr key={r.label} className="hover:bg-gray-50">
                <td className={`px-4 py-2 font-medium ${r.color}`}>{r.label}</td>
                <td className="text-right px-4 py-2">{r.count}</td>
                <td className="text-right px-4 py-2">{fmt(r.net)}</td>
                <td className="text-right px-4 py-2 text-success-700">{fmt(r.paid)}</td>
                <td className="text-right px-4 py-2 text-danger-600">
                  {r.bal > 0 ? fmt(r.bal) : "—"}
                </td>
              </tr>
            ))}
            <tr className="bg-gray-50 font-semibold border-t border-gray-200">
              <td className="px-4 py-2 text-gray-800">TOTAL</td>
              <td className="text-right px-4 py-2">
                {summary.opd.count +
                  summary.pharmacy.count +
                  summary.pathology.count +
                  summary.radiology.count +
                  summary.ipd.admissions}
              </td>
              <td className="text-right px-4 py-2">—</td>
              <td className="text-right px-4 py-2 text-success-800">
                {fmt(
                  summary.opd.collected +
                    summary.pharmacy.paid +
                    summary.pathology.paid +
                    summary.radiology.paid +
                    summary.ipd.collected,
                )}
              </td>
              <td className="text-right px-4 py-2 text-danger-700">
                {fmt(
                  summary.pharmacy.balance +
                    summary.pathology.balance +
                    summary.radiology.balance,
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
