"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataCard } from "@/components/common/DataCard";
import { useApp, useDateFormatter } from "@/lib/context";
import { apiClient } from "@/lib/apiClient";
import { printIpdBill } from "@/components/ipd/IpdBillPrinter";
import { formatTime } from "@/lib/format";
import { toast } from "sonner";
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
  const { tenant } = useApp();
  const { formatDate } = useDateFormatter();
  const [printing, setPrinting] = useState<string | null>(null);
  const bills = data?.bills ?? [];

  function fmtAdmDate(s: string) {
    const [datePart, timePart] = s.split("T");
    return { date: formatDate(datePart), time: timePart ? formatTime(timePart) : null };
  }

  async function handlePrint(b: IpdBill) {
    setPrinting(b._id);
    try {
      type Charge = { categoryName: string; quantity: number; unitPrice: number; total: number; chargeDate?: string; note?: string };
      type Payment = { amount: number; paymentMode: string; note?: string; date: string; addedByName?: string };

      const [chargesRes, paymentsRes] = await Promise.all([
        apiClient.get<Charge[]>(`/api/dashboard/ipd/${b._id}/charges`),
        apiClient.get<Payment[]>(`/api/dashboard/ipd/${b._id}/payments`),
      ]);

      const rawCharges = chargesRes.data ?? [];
      const rawPayments = paymentsRes.data ?? [];

      const charges = rawCharges.map((c) => ({
        categoryName: c.categoryName,
        quantity: c.quantity,
        unitPrice: c.unitPrice,
        total: c.total,
        date: c.chargeDate ?? "",
        note: c.note,
      }));

      const lastPayment = rawPayments.length > 0 ? rawPayments[rawPayments.length - 1] as Payment : undefined;

      const pt = b.patientId;
      printIpdBill({
        ipdNumber: b.ipdNumber ?? 0,
        admissionDate: b.admissionDate,
        dischargeDate: b.dischargeDate,
        caseNumber: b.caseNumber,
        bedNumber: b.bedNumber,
        bedGroup: b.bedGroup,
        patientName: pt?.name ?? "—",
        uhid: pt?.uhid,
        patientAge: pt?.age,
        patientGender: pt?.gender,
        patientPhone: pt?.phone,
        doctorName: b.doctorId?.name,
        doctorSpecialization: b.doctorId?.specialization,
        charges,
        totalCharges: b.totalCharges,
        payment: lastPayment
          ? {
              amount: lastPayment.amount,
              paymentMode: lastPayment.paymentMode,
              note: lastPayment.note,
              date: lastPayment.date,
              addedByName: lastPayment.addedByName,
            }
          : undefined,
        totalPaid: b.totalPaid,
        balance: b.balance,
        currency: tenant?.currency,
        currencySymbol: tenant?.currencySymbol ?? "₹",
        clinicName: tenant?.name ?? "Hospital",
        clinicAddress: tenant?.address,
        logoUrl: tenant?.logoUrl,
        printLayouts: tenant?.printLayouts,
        printShowLogo: tenant?.printShowLogo,
        printHeaderImages: tenant?.printHeaderImages,
        printFooterContents: tenant?.printFooterContents,
      });
    } catch {
      toast.error("Failed to load bill data");
    } finally {
      setPrinting(null);
    }
  }

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
                {(() => { const { date, time } = fmtAdmDate(b.admissionDate); return (
                  <div>{date}{time && <span className="text-gray-400 ml-1">{time}</span>}</div>
                ); })()}
                {b.dischargeDate && (
                  <div className="text-gray-400">→ {fmtAdmDate(b.dischargeDate).date}</div>
                )}
              </td>
              <td className="px-3 py-2">
                <div className="font-medium">{b.patientId?.name ?? "—"}</div>
                {b.patientId?.uhid != null && (
                  <div className="text-gray-400">{b.patientId.uhid}</div>
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
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handlePrint(b)}
                    disabled={printing === b._id}
                    title="Print Bill"
                    className="h-6 px-2 text-2xs text-primary-600 hover:text-primary-700"
                  >
                    <Printer className="w-3 h-3 mr-1" />
                    {printing === b._id ? "…" : "Print"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => router.push(`/ipd/${b._id}`)}
                    className="h-6 px-2 text-2xs"
                  >
                    View
                  </Button>
                </div>
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
