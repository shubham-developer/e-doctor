"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataCard } from "@/components/common/DataCard";
import { useApp } from "@/lib/context";
import { printOpdReceipt } from "@/components/patients/OpdReceiptPrinter";
import type { OpdBill, Paginated } from "./types";

export function OpdBillingTable({
  data,
  loading,
  fmt,
}: {
  data: Paginated<OpdBill> | null;
  loading: boolean;
  fmt: (n: number) => string;
}) {
  const { tenant } = useApp();

  const printOpd = (b: OpdBill) => {
    const p = b.patientId;
    printOpdReceipt({
      opdNumber: b.opdNumber,
      caseNumber: b.caseNumber,
      visitDate: b.visitDate,
      visitTime: new Date(b.createdAt).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      patientName: p?.name ?? "—",
      uhid: p?.uhid,
      patientAge: p?.age ?? 0,
      patientAgeMonths: p?.ageMonths,
      patientAgeDays: p?.ageDays,
      patientGender: p?.gender,
      patientBloodGroup: p?.bloodGroup,
      patientAddress: p?.address,
      patientAllergies: p?.allergies,
      previousMedicalIssue: p?.previousMedicalIssue,
      doctorName: b.doctorId?.name,
      doctorSpecialization:
        b.doctorId?.designation ?? b.doctorId?.specialization,
      chiefComplaint: b.chiefComplaint ?? "",
      charges: b.charges ?? [],
      totalFee: b.totalFee,
      appliedCharge: b.appliedCharge,
      discount: b.discount,
      tax: b.tax,
      clinicName: tenant?.name ?? "",
      clinicAddress: tenant?.address,
      logoUrl: tenant?.logoUrl,
      printLayouts: tenant?.printLayouts,
      printShowLogo: tenant?.printShowLogo,
      printHeaderImages: tenant?.printHeaderImages,
      printFooterContents: tenant?.printFooterContents,
    });
  };

  const bills = data?.bills ?? [];

  return (
    <DataCard
      title="OPD Billing"
      meta={data?.total != null ? `${data.total} records` : undefined}
      loading={loading}
    >
      <table className="w-full text-xs min-w-[700px]">
        <thead>
          <tr className="text-gray-500 border-b border-gray-100 bg-gray-50">
            <th className="text-left px-3 py-2">Date</th>
            <th className="text-left px-3 py-2">OPD No</th>
            <th className="text-left px-3 py-2">Patient</th>
            <th className="text-left px-3 py-2">Doctor</th>
            <th className="text-left px-3 py-2">Mode</th>
            <th className="text-right px-3 py-2">Amount</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {bills.map((b) => (
            <tr key={b._id} className="hover:bg-gray-50">
              <td className="px-3 py-2 whitespace-nowrap">{b.visitDate}</td>
              <td className="px-3 py-2 font-mono text-2xs">
                OPDN{String(b.opdNumber).padStart(4, "0")}
              </td>
              <td className="px-3 py-2">
                <div className="font-medium">{b.patientId?.name ?? "—"}</div>
                {b.patientId?.uhid && (
                  <div className="text-gray-400">{b.patientId.uhid}</div>
                )}
              </td>
              <td className="px-3 py-2">{b.doctorId?.name ?? "—"}</td>
              <td className="px-3 py-2 capitalize">
                {b.paymentMode ?? "Cash"}
              </td>
              <td className="px-3 py-2 text-right font-medium text-success-700">
                {fmt(b.appliedCharge ?? b.totalFee ?? 0)}
              </td>
              <td className="px-3 py-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => printOpd(b)}
                  className="h-6 px-2 text-2xs"
                >
                  <Printer className="w-3 h-3 mr-1" />
                  Print
                </Button>
              </td>
            </tr>
          ))}
          {bills.length === 0 && !loading && (
            <tr>
              <td
                colSpan={7}
                className="px-4 py-8 text-center text-gray-400 text-xs"
              >
                No OPD bills for this period
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </DataCard>
  );
}
