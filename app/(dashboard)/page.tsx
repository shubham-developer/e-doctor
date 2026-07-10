"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { useCurrency } from "@/lib/context";
import { useApiQuery } from "@/lib/useApiQuery";
import { DateRangeFilter } from "@/components/common/DateRangeFilter";
import { getPresetRange, type DateRangePreset } from "@/lib/dateRangePresets";
import { IncomeCards } from "@/components/dashboard/IncomeCards";
import { IncomeExpenseChart } from "@/components/dashboard/IncomeExpenseChart";
import { IncomeDonutChart } from "@/components/dashboard/IncomeDonutChart";
import { SummaryStats } from "@/components/dashboard/SummaryStats";
import type { DashboardStats, Income } from "@/components/dashboard/types";

const EMPTY_INCOME: Income = {
  opd: 0,
  ipd: 0,
  pharmacy: 0,
  pathology: 0,
  radiology: 0,
  bloodBank: 0,
  ambulance: 0,
  general: 0,
};

export default function DashboardPage() {
  const { fmt, sym } = useCurrency();
  const [preset, setPreset] = useState<DateRangePreset>("year");
  const [{ from, to }, setRange] = useState(() => getPresetRange("year"));

  const {
    data: stats,
    isPending: loading,
    isFetching: refreshing,
  } = useApiQuery<DashboardStats>(
    ["dashboard-stats", from, to],
    `/api/dashboard/stats?from=${from}&to=${to}`,
    { keepPrevious: true },
  );

  const income = stats?.income ?? EMPTY_INCOME;
  const expenses = stats?.expenses ?? 0;
  const trend = stats?.trend ?? [];
  const granularity = stats?.granularity ?? "month";
  const totalIncome = Object.values(income).reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="bg-white border border-gray-200 rounded-lg p-3 flex flex-wrap gap-2 items-center">
        <DateRangeFilter
          preset={preset}
          from={from}
          to={to}
          onChange={(next) => {
            setPreset(next.preset);
            setRange({ from: next.from, to: next.to });
          }}
        />
        {refreshing && (
          <RefreshCw className="w-3.5 h-3.5 text-primary-500 animate-spin ml-auto" />
        )}
      </div>

      <IncomeCards
        income={income}
        expenses={expenses}
        loading={loading}
        fmt={fmt}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <IncomeExpenseChart
          trend={trend}
          granularity={granularity}
          loading={loading}
          fmt={fmt}
          sym={sym}
        />
        <IncomeDonutChart income={income} loading={loading} fmt={fmt} />
      </div>

      <SummaryStats
        totalPatients={stats?.totalPatients ?? 0}
        totalStaff={stats?.totalStaff ?? 0}
        totalIncome={totalIncome}
        loading={loading}
        fmt={fmt}
      />
    </div>
  );
}
