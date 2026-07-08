"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Users, Users2, Wallet } from "lucide-react";

interface SummaryStatsProps {
  totalPatients: number;
  totalStaff: number;
  totalIncome: number;
  loading: boolean;
  fmt: (n: number) => string;
}

export function SummaryStats({
  totalPatients,
  totalStaff,
  totalIncome,
  loading,
  fmt,
}: SummaryStatsProps) {
  return (
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
            <p className="text-xl font-bold text-gray-800">{totalPatients}</p>
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
            <p className="text-xl font-bold text-gray-800">{totalStaff}</p>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-3">
        <div className="w-9 h-9 bg-success-50 rounded-lg flex items-center justify-center">
          <Wallet className="w-4.5 h-4.5 text-success-600" />
        </div>
        <div>
          <p className="text-xs text-gray-500">Total Income</p>
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
  );
}
