"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { UserRound } from "lucide-react";
import type { DoctorRevenueData, DoctorRevRow } from "./types";

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  color = "text-gray-800",
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex flex-col gap-1">
      <p className="text-2xs font-semibold text-gray-500 uppercase tracking-wide">
        {label}
      </p>
      <p className={`text-lg font-bold leading-none ${color}`}>{value}</p>
      {sub && <p className="text-2xs text-gray-400">{sub}</p>}
    </div>
  );
}

// ── Custom tooltip ────────────────────────────────────────────────────────────

function ChartTooltip({
  active,
  payload,
  label,
  fmt,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
  fmt: (n: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs min-w-[160px]">
      <p className="font-semibold text-gray-800 mb-2 truncate max-w-[180px]">
        {label}
      </p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <span style={{ color: p.color }} className="font-medium">
            {p.name}
          </span>
          <span className="font-mono text-gray-700">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Doctor row ────────────────────────────────────────────────────────────────

function DoctorRow({
  d,
  rank,
  fmt,
}: {
  d: DoctorRevRow;
  rank: number;
  fmt: (n: number) => string;
}) {
  const opdBalance = d.opd.net - d.opd.collected;
  const ipdBalance = d.ipd.charges - d.ipd.collected;

  return (
    <tr className="hover:bg-gray-50 border-b border-gray-100 last:border-0">
      <td className="px-3 py-2.5 text-2xs text-gray-400 font-mono w-8">
        {rank}
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
            <UserRound className="w-3 h-3 text-primary-600" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-800">{d.name}</p>
            {d.specialization && (
              <p className="text-2xs text-gray-400">{d.specialization}</p>
            )}
          </div>
        </div>
      </td>

      {/* OPD */}
      <td className="px-3 py-2.5 text-right">
        <span className="text-xs text-gray-600">{d.opd.count}</span>
      </td>
      <td className="px-3 py-2.5 text-right">
        <span className="text-xs font-mono text-gray-700">
          {d.opd.net > 0 ? fmt(d.opd.net) : "—"}
        </span>
      </td>
      <td className="px-3 py-2.5 text-right">
        <span className="text-xs font-mono text-success-700">
          {d.opd.collected > 0 ? fmt(d.opd.collected) : "—"}
        </span>
      </td>
      <td className="px-3 py-2.5 text-right">
        <span
          className={`text-xs font-mono ${opdBalance > 0 ? "text-danger-600" : "text-gray-300"}`}
        >
          {opdBalance > 0 ? fmt(opdBalance) : "—"}
        </span>
      </td>

      {/* IPD */}
      <td className="px-3 py-2.5 text-right">
        <span className="text-xs text-gray-600">{d.ipd.admissions}</span>
      </td>
      <td className="px-3 py-2.5 text-right">
        <span className="text-xs font-mono text-gray-700">
          {d.ipd.charges > 0 ? fmt(d.ipd.charges) : "—"}
        </span>
      </td>
      <td className="px-3 py-2.5 text-right">
        <span className="text-xs font-mono text-success-700">
          {d.ipd.collected > 0 ? fmt(d.ipd.collected) : "—"}
        </span>
      </td>
      <td className="px-3 py-2.5 text-right">
        <span
          className={`text-xs font-mono ${ipdBalance > 0 ? "text-danger-600" : "text-gray-300"}`}
        >
          {ipdBalance > 0 ? fmt(ipdBalance) : "—"}
        </span>
      </td>

      {/* Total */}
      <td className="px-3 py-2.5 text-right">
        <span className="text-xs font-mono font-bold text-gray-900">
          {fmt(d.total)}
        </span>
      </td>
      <td className="px-3 py-2.5 text-right">
        <span className="text-xs font-mono font-semibold text-success-700">
          {fmt(d.collected)}
        </span>
      </td>
    </tr>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const OPD_COLOR = "#3b82f6";
const IPD_COLOR = "#8b5cf6";

export function DoctorRevenueReport({
  data,
  fmt,
}: {
  data: DoctorRevenueData;
  fmt: (n: number) => string;
}) {
  const doctors = data?.doctors ?? [];
  const totals = data?.totals ?? { revenue: 0, visits: 0, collections: 0 };

  if (doctors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
        <UserRound className="w-12 h-12 opacity-20" />
        <p className="text-sm font-medium">No data for this period</p>
        <p className="text-xs">No OPD visits or IPD admissions with assigned doctors.</p>
      </div>
    );
  }

  // Show top 10 in chart; table shows all
  const chartDoctors = doctors.slice(0, 10);
  const chartData = chartDoctors.map((d) => ({
    name: d.name.split(" ").slice(0, 2).join(" "),
    OPD: Math.round(d.opd.net),
    IPD: Math.round(d.ipd.charges),
  }));

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          label="Doctors"
          value={doctors.length}
          sub="with revenue"
          color="text-primary-600"
        />
        <StatCard
          label="Total Revenue"
          value={fmt(totals.grand)}
          sub={`Collected: ${fmt(totals.grandCollected)}`}
          color="text-gray-900"
        />
        <StatCard
          label="OPD Revenue"
          value={fmt(totals.opdNet)}
          sub={`${totals.opdCount} visits`}
        />
        <StatCard
          label="IPD Revenue"
          value={fmt(totals.ipdCharges)}
          sub={`${totals.ipdAdmissions} admissions`}
        />
        <StatCard
          label="Total Collected"
          value={fmt(totals.grandCollected)}
          color="text-success-700"
        />
        <StatCard
          label="Outstanding"
          value={fmt(totals.grand - totals.grandCollected)}
          color={totals.grand - totals.grandCollected > 0 ? "text-danger-600" : "text-gray-400"}
        />
      </div>

      {/* Bar chart */}
      {chartData.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-700 mb-4">
            Revenue by Doctor{doctors.length > 10 ? " (Top 10)" : ""}
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={chartData}
              margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: "#6b7280" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 9, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => {
                  if (v >= 100000) return `${(v / 100000).toFixed(1)}L`;
                  if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
                  return String(v);
                }}
                width={40}
              />
              <Tooltip content={<ChartTooltip fmt={fmt} />} />
              <Legend
                wrapperStyle={{ fontSize: 10, color: "#6b7280" }}
                iconSize={8}
              />
              <Bar dataKey="OPD" fill={OPD_COLOR} radius={[3, 3, 0, 0]} maxBarSize={40}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={OPD_COLOR} />
                ))}
              </Bar>
              <Bar dataKey="IPD" fill={IPD_COLOR} radius={[3, 3, 0, 0]} maxBarSize={40}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={IPD_COLOR} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Detail table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-800">Doctor-wise Breakdown</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[900px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2.5 text-left w-8" />
                <th className="px-3 py-2.5 text-left text-2xs font-semibold text-gray-500 uppercase tracking-wide">
                  Doctor
                </th>
                {/* OPD group */}
                <th className="px-3 py-2.5 text-right text-2xs font-semibold text-blue-500 uppercase tracking-wide">
                  OPD Visits
                </th>
                <th className="px-3 py-2.5 text-right text-2xs font-semibold text-blue-500 uppercase tracking-wide">
                  OPD Revenue
                </th>
                <th className="px-3 py-2.5 text-right text-2xs font-semibold text-blue-500 uppercase tracking-wide">
                  OPD Collected
                </th>
                <th className="px-3 py-2.5 text-right text-2xs font-semibold text-blue-500 uppercase tracking-wide">
                  OPD Balance
                </th>
                {/* IPD group */}
                <th className="px-3 py-2.5 text-right text-2xs font-semibold text-purple-500 uppercase tracking-wide">
                  IPD Adm.
                </th>
                <th className="px-3 py-2.5 text-right text-2xs font-semibold text-purple-500 uppercase tracking-wide">
                  IPD Charges
                </th>
                <th className="px-3 py-2.5 text-right text-2xs font-semibold text-purple-500 uppercase tracking-wide">
                  IPD Collected
                </th>
                <th className="px-3 py-2.5 text-right text-2xs font-semibold text-purple-500 uppercase tracking-wide">
                  IPD Balance
                </th>
                {/* Totals */}
                <th className="px-3 py-2.5 text-right text-2xs font-semibold text-gray-600 uppercase tracking-wide">
                  Total Revenue
                </th>
                <th className="px-3 py-2.5 text-right text-2xs font-semibold text-gray-600 uppercase tracking-wide">
                  Total Collected
                </th>
              </tr>
            </thead>
            <tbody>
              {doctors.map((d, i) => (
                <DoctorRow key={d.doctorId} d={d} rank={i + 1} fmt={fmt} />
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-300 font-semibold text-xs">
                <td colSpan={2} className="px-3 py-2.5 text-gray-700">
                  {doctors.length} doctor{doctors.length !== 1 ? "s" : ""}
                </td>
                <td className="px-3 py-2.5 text-right text-gray-700">
                  {totals.opdCount}
                </td>
                <td className="px-3 py-2.5 text-right text-gray-700">
                  {fmt(totals.opdNet)}
                </td>
                <td className="px-3 py-2.5 text-right text-gray-700">
                  {fmt(doctors.reduce((s, d) => s + d.opd.collected, 0))}
                </td>
                <td className="px-3 py-2.5 text-right text-danger-600">
                  {fmt(
                    doctors.reduce(
                      (s, d) => s + Math.max(0, d.opd.net - d.opd.collected),
                      0,
                    ),
                  )}
                </td>
                <td className="px-3 py-2.5 text-right text-gray-700">
                  {totals.ipdAdmissions}
                </td>
                <td className="px-3 py-2.5 text-right text-gray-700">
                  {fmt(totals.ipdCharges)}
                </td>
                <td className="px-3 py-2.5 text-right text-gray-700">
                  {fmt(doctors.reduce((s, d) => s + d.ipd.collected, 0))}
                </td>
                <td className="px-3 py-2.5 text-right text-danger-600">
                  {fmt(
                    doctors.reduce(
                      (s, d) => s + Math.max(0, d.ipd.charges - d.ipd.collected),
                      0,
                    ),
                  )}
                </td>
                <td className="px-3 py-2.5 text-right text-gray-900 font-bold">
                  {fmt(totals.grand)}
                </td>
                <td className="px-3 py-2.5 text-right text-success-700 font-bold">
                  {fmt(totals.grandCollected)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
