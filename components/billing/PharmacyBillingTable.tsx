"use client";

import { Printer, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataCard } from "@/components/common/DataCard";
import { useApp } from "@/lib/context";
import { formatDateTime } from "@/lib/format";
import { printPharmacyBillReceipt } from "@/components/pharmacy/PharmacyBillPrinter";
import { StatusBadge } from "./StatusBadge";
import type { PharBill, Paginated } from "./types";

export function PharmacyBillingTable({
  data,
  loading,
  fmt,
  onPay,
}: {
  data: Paginated<PharBill> | null;
  loading: boolean;
  fmt: (n: number) => string;
  onPay: (billId: string, balance: number, patientName: string) => void;
}) {
  const { tenant } = useApp();
  const sym = tenant?.currencySymbol ?? "₹";

  const printPhar = (b: PharBill) => {
    const p = b.patientId;
    printPharmacyBillReceipt({
      billNumber: b.billNumber,
      billDate: formatDateTime(b.createdAt),
      currency: tenant?.currency,
      currencySymbol: sym,
      caseId: b.caseId,
      prescriptionNo: b.prescriptionNo,
      patientName: p?.name,
      uhid: p?.uhid != null ? String(p.uhid) : undefined,
      doctorName: b.doctorId?.name ?? b.doctorName,
      lines: b.lines ?? [],
      totalAmount: b.totalAmount,
      discountAmount: b.discountAmount,
      taxAmount: b.taxAmount,
      netAmount: b.netAmount,
      paidAmount: b.paidAmount,
      paymentMode: b.paymentMode ?? "Cash",
      clinicName: tenant?.name ?? "",
      clinicAddress: tenant?.address,
      logoUrl: tenant?.logoUrl,
      printLayouts: tenant?.printLayouts,
      printShowLogo: tenant?.printShowLogo,
    });
  };

  const bills = data?.bills ?? [];

  return (
    <DataCard
      title="Pharmacy Billing"
      meta={data?.total != null ? `${data.total} records` : undefined}
      loading={loading}
    >
      <table className="w-full text-xs min-w-[820px]">
        <thead>
          <tr className="text-gray-500 border-b border-gray-100 bg-gray-50">
            <th className="text-left px-3 py-2">Date</th>
            <th className="text-left px-3 py-2">Bill No</th>
            <th className="text-left px-3 py-2">Patient</th>
            <th className="text-right px-3 py-2">Net</th>
            <th className="text-right px-3 py-2">Paid</th>
            <th className="text-right px-3 py-2">Balance</th>
            <th className="text-left px-3 py-2">Mode</th>
            <th className="text-left px-3 py-2">Status</th>
            <th className="text-left px-3 py-2">By</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {bills.map((b) => {
            const balance = b.netAmount - b.paidAmount;
            return (
              <tr key={b._id} className="hover:bg-gray-50">
                <td className="px-3 py-2 whitespace-nowrap">
                  {new Date(b.createdAt).toISOString().slice(0, 10)}
                </td>
                <td className="px-3 py-2 font-mono text-2xs">
                  PHARMAB{b.billNumber}
                </td>
                <td className="px-3 py-2">
                  <div className="font-medium">{b.patientId?.name ?? "—"}</div>
                  {b.patientId?.uhid != null && (
                    <div className="text-gray-400">
                      {b.patientId.uhid}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 text-right">{fmt(b.netAmount)}</td>
                <td className="px-3 py-2 text-right text-success-700">
                  {fmt(b.paidAmount)}
                </td>
                <td className="px-3 py-2 text-right text-danger-600">
                  {balance > 0 ? fmt(balance) : "—"}
                </td>
                <td className="px-3 py-2 capitalize">{b.paymentMode}</td>
                <td className="px-3 py-2">
                  <StatusBadge paid={b.paidAmount} balance={balance} />
                </td>
                <td className="px-3 py-2">{b.createdBy?.name ?? "—"}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => printPhar(b)}
                      className="h-6 px-2 text-2xs"
                    >
                      <Printer className="w-3 h-3 mr-1" />
                      Print
                    </Button>
                    {balance > 0 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          onPay(b._id, balance, b.patientId?.name ?? "")
                        }
                        className="h-6 px-2 text-2xs text-primary-600"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Pay
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
          {bills.length === 0 && !loading && (
            <tr>
              <td
                colSpan={10}
                className="px-4 py-8 text-center text-gray-400 text-xs"
              >
                No pharmacy bills for this period
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </DataCard>
  );
}
