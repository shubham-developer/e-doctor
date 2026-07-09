"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { PieChart, Pie, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ChartPanel } from "./ChartPanel";
import { INCOME_CARDS, DONUT_COLORS } from "./config";
import type { Income } from "./types";

interface IncomeDonutChartProps {
  income: Income;
  loading: boolean;
  fmt: (n: number) => string;
}

export function IncomeDonutChart({
  income,
  loading,
  fmt,
}: IncomeDonutChartProps) {
  const donutData = INCOME_CARDS.map((c, i) => ({
    name: c.label.replace(" Income", ""),
    value: income[c.key],
    color: DONUT_COLORS[i],
  })).filter((d) => d.value > 0);

  return (
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
  );
}
