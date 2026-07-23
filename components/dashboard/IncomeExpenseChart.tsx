"use client";

import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChartPanel } from "./ChartPanel";
import type { TrendGranularity } from "./types";

const SERIES = {
  income: { key: "income", label: "Income", color: "#2563eb" },
  expenses: { key: "expenses", label: "Expense", color: "#d97706" },
} as const;

function fmtAxis(v: number) {
  if (v >= 100000) return `${(v / 100000).toFixed(0)}L`;
  if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
  return String(v);
}

interface IncomeExpenseChartProps {
  trend: Array<{ period: string; income: number; expenses: number }>;
  granularity: TrendGranularity;
  loading: boolean;
  fmt: (n: number) => string;
  sym: string;
}

function ChartTooltip({
  active,
  payload,
  label,
  fmt,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: keyof typeof SERIES; value: number }>;
  label?: string;
  fmt: (n: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md">
      <p className="text-2xs font-medium text-gray-400 mb-1.5">{label}</p>
      <div className="space-y-1">
        {payload.map((entry) => {
          const meta = SERIES[entry.dataKey];
          return (
            <div
              key={entry.dataKey}
              className="flex items-center gap-2 text-xs"
            >
              <span
                className="inline-block w-3 h-0.5 rounded-full shrink-0"
                style={{ backgroundColor: meta.color }}
              />
              <span className="text-gray-500">{meta.label}</span>
              <span className="font-semibold text-gray-900 ml-4 tabular-nums">
                {fmt(entry.value)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChartLegend() {
  return (
    <div className="flex items-center justify-center gap-4 mb-2">
      {Object.values(SERIES).map((s) => (
        <div key={s.key} className="flex items-center gap-1.5">
          <span
            className="inline-block w-3.5 h-0.5 rounded-full"
            style={{ backgroundColor: s.color }}
          />
          <span className="text-2xs font-medium text-gray-500">
            {s.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export function IncomeExpenseChart({
  trend,
  loading,
  fmt,
}: IncomeExpenseChartProps) {
  return (
    <ChartPanel title="Income & Expense">
      {loading ? (
        <Skeleton className="w-full rounded" style={{ height: 260 }} />
      ) : (
        <>
          <ChartLegend />
          <ResponsiveContainer width="100%" height={232}>
            <AreaChart
              data={trend}
              margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
            >
              <defs>
                <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={SERIES.income.color}
                    stopOpacity={0.16}
                  />
                  <stop
                    offset="100%"
                    stopColor={SERIES.income.color}
                    stopOpacity={0}
                  />
                </linearGradient>
                <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={SERIES.expenses.color}
                    stopOpacity={0.16}
                  />
                  <stop
                    offset="100%"
                    stopColor={SERIES.expenses.color}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="period"
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                tickMargin={8}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickFormatter={fmtAxis}
                axisLine={false}
                tickLine={false}
                width={36}
              />
              <Tooltip
                content={<ChartTooltip fmt={fmt} />}
                cursor={{ stroke: "#cbd5e1", strokeWidth: 1 }}
              />
              <Area
                type="monotone"
                dataKey="income"
                stroke={SERIES.income.color}
                strokeWidth={2}
                fill="url(#incomeFill)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
              />
              <Area
                type="monotone"
                dataKey="expenses"
                stroke={SERIES.expenses.color}
                strokeWidth={2}
                fill="url(#expenseFill)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </>
      )}
    </ChartPanel>
  );
}
