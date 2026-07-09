"use client";

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
} from "recharts";
import { ChartPanel } from "./ChartPanel";
import type { TrendGranularity } from "./types";

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

export function IncomeExpenseChart({
  trend,
  granularity,
  loading,
  fmt,
  sym,
}: IncomeExpenseChartProps) {
  return (
    <ChartPanel title="Income & Expense">
      {loading ? (
        <Skeleton className="w-full rounded" style={{ height: 260 }} />
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart
            data={trend}
            margin={{ top: 5, right: 10, left: 0, bottom: 16 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="period"
              tick={{ fontSize: 11, fill: "#6b7280" }}
              axisLine={false}
              tickLine={false}
              label={{
                value: granularity === "day" ? "Date" : "Month",
                position: "insideBottom",
                offset: -8,
                style: { fontSize: 11, fill: "#9ca3af" },
              }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#6b7280" }}
              tickFormatter={fmtAxis}
              axisLine={false}
              tickLine={false}
              width={40}
              label={{
                value: `Amount (${sym})`,
                angle: -90,
                position: "insideLeft",
                style: { fontSize: 11, fill: "#9ca3af", textAnchor: "middle" },
              }}
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
              name="Expense"
              stroke="#f43f5e"
              strokeWidth={2}
              dot={{ r: 3, fill: "#f43f5e" }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartPanel>
  );
}
