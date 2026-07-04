"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DataCard } from "@/components/common/DataCard";
import type { IpdBill, Paginated } from "./types";

export function IpdBillingTable({
  data,
  loading,
  fmt,
}: {
  data: Paginated<IpdBill> | null;
  loading: boolean;
  fmt: (n: number) => string;
}) {
  const router = useRouter();
  const bills = data?.bills ?? [];

  return (
    <DataCard
      title="IPD Billing"
      meta={data?.total != null ? `${data.total} records` : undefined}
      loading={loading}
    >
      <table className="w-full text-xs min-w-[820px]">
        <thead>
          <tr className="text-gray-500 border-b border-gray-100 bg-gray-50">
            <th className="text-left px-3 py-2">Admission</th>
            <th className="text-left px-3 py-2">Patient</th>
            <th className="text-left px-3 py-2">Doctor</th>
            <th className="text-left px-3 py-2">Status</th>
            <th className="text-right px-3 py-2">Total Charges</th>
            <th className="text-right px-3 py-2">Paid</th>
            <th className="text-right px-3 py-2">Balance</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {bills.map((b) => (
            <tr key={b._id} className="hover:bg-gray-50">
              <td className="px-3 py-2 whitespace-nowrap">
                <div>{b.admissionDate}</div>
                {b.dischargeDate && (
                  <div className="text-gray-400">→ {b.dischargeDate}</div>
                )}
              </td>
              <td className="px-3 py-2">
                <div className="font-medium">{b.patientId?.name ?? "—"}</div>
                {b.patientId?.patientCode != null && (
                  <div className="text-gray-400">{b.patientId.patientCode}</div>
                )}
              </td>
              <td className="px-3 py-2">{b.doctorId?.name ?? "—"}</td>
              <td className="px-3 py-2">
                <span
                  className={`px-1.5 py-0.5 rounded text-2xs font-semibold ${
                    b.status?.toUpperCase() === "DISCHARGED"
                      ? "bg-success-100 text-success-700"
                      : "bg-primary-100 text-primary-700"
                  }`}
                >
                  {b.status?.toUpperCase() === "DISCHARGED"
                    ? "Discharged"
                    : "Admitted"}
                </span>
              </td>
              <td className="px-3 py-2 text-right">{fmt(b.totalCharges)}</td>
              <td className="px-3 py-2 text-right text-success-700">
                {fmt(b.totalPaid)}
              </td>
              <td className="px-3 py-2 text-right">
                {b.balance > 0 ? (
                  <span className="text-danger-600 font-medium">
                    {fmt(b.balance)}
                  </span>
                ) : (
                  <span className="text-success-600">Paid</span>
                )}
              </td>
              <td className="px-3 py-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => router.push(`/dashboard/ipd/${b._id}`)}
                  className="h-6 px-2 text-2xs"
                >
                  View
                </Button>
              </td>
            </tr>
          ))}
          {bills.length === 0 && !loading && (
            <tr>
              <td
                colSpan={8}
                className="px-4 py-8 text-center text-gray-400 text-xs"
              >
                No IPD admissions for this period
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </DataCard>
  );
}
