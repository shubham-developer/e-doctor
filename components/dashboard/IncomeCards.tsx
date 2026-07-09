"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { TrendingDown } from "lucide-react";
import { INCOME_CARDS } from "./config";
import type { Income } from "./types";

interface IncomeCardsProps {
  income: Income;
  expenses: number;
  loading: boolean;
  fmt: (n: number) => string;
}

export function IncomeCards({
  income,
  expenses,
  loading,
  fmt,
}: IncomeCardsProps) {
  return (
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
  );
}
