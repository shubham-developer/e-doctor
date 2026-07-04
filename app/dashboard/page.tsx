"use client";

import { useEffect, useState } from "react";
import { useApp, useCurrency } from "@/lib/context";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
} from "recharts";
import type { LucideIcon } from "lucide-react";
import {
  Stethoscope,
  Building2,
  Pill,
  FlaskConical,
  Activity,
  Droplets,
  Truck,
  Wallet,
  TrendingDown,
  Minus,
  X as XIcon,
  Users,
  Users2,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Income {
  opd: number;
  ipd: number;
  pharmacy: number;
  pathology: number;
  radiology: number;
  bloodBank: number;
  ambulance: number;
  general: number;
}

interface DashboardStats {
  income: Income;
  expenses: number;
  monthly: Array<{ month: string; income: number; expenses: number }>;
  totalPatients: number;
  totalStaff: number;
}

// ─── Config ────────────────────────────────────────────────────────────────────

const INCOME_CARDS: Array<{
  key: keyof Income;
  label: string;
  icon: LucideIcon;
}> = [
  { key: "opd", label: "OPD Income", icon: Stethoscope },
  { key: "ipd", label: "IPD Income", icon: Building2 },
  { key: "pharmacy", label: "Pharmacy Income", icon: Pill },
  { key: "pathology", label: "Pathology Income", icon: FlaskConical },
  { key: "radiology", label: "Radiology Income", icon: Activity },
  { key: "bloodBank", label: "Blood Bank Income", icon: Droplets },
  { key: "ambulance", label: "Ambulance Income", icon: Truck },
  { key: "general", label: "General Income", icon: Wallet },
];

const DONUT_COLORS = [
  "#78350f",
  "#f97316",
  "#eab308",
  "#14b8a6",
  "#8b5cf6",
  "#3b82f6",
  "#94a3b8",
  "#22c55e",
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmtAxis(v: number) {
  if (v >= 100000) return `${(v / 100000).toFixed(0)}L`;
  if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
  return String(v);
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function ChartPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50/60">
        <span className="text-sm font-semibold text-gray-700">{title}</span>
        <div className="flex items-center gap-1.5 text-gray-300">
          <button className="hover:text-gray-500 transition-colors">
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button className="hover:text-gray-500 transition-colors">
            <XIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { tenant } = useApp();
  const { sym, fmt } = useCurrency();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setStats(d.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const income = stats?.income ?? {
    opd: 0,
    ipd: 0,
    pharmacy: 0,
    pathology: 0,
    radiology: 0,
    bloodBank: 0,
    ambulance: 0,
    general: 0,
  };
  const expenses = stats?.expenses ?? 0;
  const monthly = stats?.monthly ?? [];

  const totalIncome = Object.values(income).reduce((a, b) => a + b, 0);

  const donutData = INCOME_CARDS.map((c, i) => ({
    name: c.label.replace(" Income", ""),
    value: income[c.key],
    color: DONUT_COLORS[i],
  })).filter((d) => d.value > 0);

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-auto">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-gray-800">Dashboard</h1>
          <p className="text-xs text-gray-400">{tenant?.name ?? "Clinic"}</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-success-600 font-medium">
          <span className="w-2 h-2 bg-success-500 rounded-full animate-pulse" />
          Live
        </div>
      </div>

      <div className="flex-1 p-4 space-y-4 min-h-0">
        {/* ── Income cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {INCOME_CARDS.map((card) => (
            <div
              key={card.key}
              className="bg-white border border-gray-200 rounded-lg px-3 py-3 flex items-center gap-3 hover:shadow-sm transition-shadow"
            >
              <div className="w-10 h-10 bg-success-600 rounded-lg flex items-center justify-center shrink-0">
                <card.icon className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                {loading ? (
                  <>
                    <Skeleton className="h-2.5 w-20 mb-1.5" />
                    <Skeleton className="h-4 w-16" />
                  </>
                ) : (
                  <>
                    <p className="text-xs text-gray-500 leading-none truncate">
                      {card.label}
                    </p>
                    <p className="text-sm font-bold text-gray-800 mt-1">
                      {fmt(income[card.key])}
                    </p>
                  </>
                )}
              </div>
            </div>
          ))}

          {/* Expenses */}
          <div className="bg-white border border-gray-200 rounded-lg px-3 py-3 flex items-center gap-3 hover:shadow-sm transition-shadow">
            <div className="w-10 h-10 bg-rose-500 rounded-lg flex items-center justify-center shrink-0">
              <TrendingDown className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              {loading ? (
                <>
                  <Skeleton className="h-2.5 w-16 mb-1.5" />
                  <Skeleton className="h-4 w-20" />
                </>
              ) : (
                <>
                  <p className="text-xs text-gray-500 leading-none">Expenses</p>
                  <p className="text-sm font-bold text-gray-800 mt-1">
                    {fmt(expenses)}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Charts ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Yearly line chart */}
          <ChartPanel title="Yearly Income & Expense">
            {loading ? (
              <Skeleton className="w-full rounded" style={{ height: 260 }} />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart
                  data={monthly}
                  margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    tickFormatter={fmtAxis}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                  />
                  <Tooltip
                    formatter={(v) => [fmt(Number(v ?? 0))]}
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid #e5e7eb",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line
                    type="monotone"
                    dataKey="income"
                    name="Income"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#22c55e" }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="expenses"
                    name="Expenses"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#f43f5e" }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartPanel>

          {/* Monthly income semi-donut */}
          <ChartPanel title="Monthly Income Overview">
            {loading ? (
              <Skeleton className="w-full rounded" style={{ height: 260 }} />
            ) : donutData.length === 0 ? (
              <div
                className="flex items-center justify-center text-gray-400 text-sm"
                style={{ height: 260 }}
              >
                No income recorded yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <Pie
                    data={donutData.map((d) => ({ ...d, fill: d.color }))}
                    cx="50%"
                    cy="70%"
                    startAngle={180}
                    endAngle={0}
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  />
                  <Tooltip
                    formatter={(v, name) => [fmt(Number(v ?? 0)), name]}
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid #e5e7eb",
                    }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartPanel>
        </div>

        {/* ── Summary stats ── */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-3">
            <div className="w-9 h-9 bg-primary-50 rounded-lg flex items-center justify-center">
              <Users className="w-4.5 h-4.5 text-primary-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Patients</p>
              {loading ? (
                <Skeleton className="h-6 w-12 mt-1" />
              ) : (
                <p className="text-xl font-bold text-gray-800">
                  {stats?.totalPatients ?? 0}
                </p>
              )}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-3">
            <div className="w-9 h-9 bg-purple-50 rounded-lg flex items-center justify-center">
              <Users2 className="w-4.5 h-4.5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Active Staff</p>
              {loading ? (
                <Skeleton className="h-6 w-12 mt-1" />
              ) : (
                <p className="text-xl font-bold text-gray-800">
                  {stats?.totalStaff ?? 0}
                </p>
              )}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-3">
            <div className="w-9 h-9 bg-success-50 rounded-lg flex items-center justify-center">
              <Wallet className="w-4.5 h-4.5 text-success-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Income (YTD)</p>
              {loading ? (
                <Skeleton className="h-6 w-24 mt-1" />
              ) : (
                <p className="text-xl font-bold text-success-600">
                  {fmt(totalIncome)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
