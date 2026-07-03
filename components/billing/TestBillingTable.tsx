"use client";

import { Printer, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataCard } from "@/components/common/DataCard";
import { useApp } from "@/lib/context";
import { printPathologyBillReceipt } from "@/components/pathology/PathologyBillPrinter";
import { printRadiologyBillReceipt } from "@/components/radiology/RadiologyBillPrinter";
import { StatusBadge } from "./StatusBadge";
import type { PathBill, Paginated } from "./types";

export function TestBillingTable({
  module,
  data,
  loading,
  fmt,
  onPay,
}: {
  module: "pathology" | "radiology";
  data: Paginated<PathBill> | null;
  loading: boolean;
  fmt: (n: number) => string;
  onPay: (billId: string, balance: number, patientName: string) => void;
}) {
  const { tenant } = useApp();
  const sym = tenant?.currencySymbol ?? "₹";
  const printReceipt = module === "pathology" ? printPathologyBillReceipt : printRadiologyBillReceipt;
  const title = module === "pathology" ? "Pathology Billing" : "Radiology Billing";
  const emptyText = `No ${module} bills for this period`;

  const print = (b: PathBill) => {
    const p = b.patientId;
    printReceipt({
      billNo: b.billNo,
      billDate: b.billDate,
      caseId: b.caseId,
      patientName: p?.name,
      patientCode: p?.patientCode != null ? String(p.patientCode) : undefined,
      referenceDoctor: b.referenceDoctor,
      note: b.note,
      previousReportValue: b.previousReportValue,
      items: b.items ?? [],
      totalAmount: b.amount,
      discountAmount: 0,
      taxAmount: 0,
      netAmount: b.netAmount ?? b.amount,
      paidAmount: b.paidAmount,
      balance: b.balance,
      paymentMode: b.paymentMode,
      clinicName: tenant?.name ?? "",
      clinicAddress: tenant?.address,
      logoUrl: tenant?.logoUrl,
      printLayouts: tenant?.printLayouts,
      currencySymbol: sym,
    });
  };

  const bills = data?.bills ?? [];

  return (
    <DataCard title={title} meta={data?.total != null ? `${data.total} records` : undefined} loading={loading}>
      <table className="w-full text-xs min-w-[820px]">
        <thead>
          <tr className="text-gray-500 border-b border-gray-100 bg-gray-50">
            <th className="text-left px-3 py-2">Date</th>
            <th className="text-left px-3 py-2">Bill No</th>
            <th className="text-left px-3 py-2">Patient</th>
            <th className="text-left px-3 py-2">Tests</th>
            <th className="text-right px-3 py-2">Amount</th>
            <th className="text-right px-3 py-2">Paid</th>
            <th className="text-right px-3 py-2">Balance</th>
            <th className="text-left px-3 py-2">Mode</th>
            <th className="text-left px-3 py-2">Status</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {bills.map((b) => (
            <tr key={b._id} className="hover:bg-gray-50">
              <td className="px-3 py-2 whitespace-nowrap">{b.billDate}</td>
              <td className="px-3 py-2 font-mono text-2xs">{b.billNo}</td>
              <td className="px-3 py-2">
                <div className="font-medium">{b.patientId?.name ?? "—"}</div>
                {b.patientId?.patientCode != null && (
                  <div className="text-gray-400">{b.patientId.patientCode}</div>
                )}
              </td>
              <td className="px-3 py-2 text-gray-500">
                {b.items?.length ?? 0} test{(b.items?.length ?? 0) !== 1 ? "s" : ""}
              </td>
              <td className="px-3 py-2 text-right">{fmt(b.amount)}</td>
              <td className="px-3 py-2 text-right text-success-700">{fmt(b.paidAmount)}</td>
              <td className="px-3 py-2 text-right text-danger-600">
                {b.balance > 0 ? fmt(b.balance) : "—"}
              </td>
              <td className="px-3 py-2 capitalize">{b.paymentMode ?? "Cash"}</td>
              <td className="px-3 py-2">
                <StatusBadge paid={b.paidAmount} balance={b.balance} />
              </td>
              <td className="px-3 py-2">
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => print(b)}
                    className="h-6 px-2 text-2xs"
                  >
                    <Printer className="w-3 h-3 mr-1" />
                    Print
                  </Button>
                  {b.balance > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onPay(b._id, b.balance, b.patientId?.name ?? "")}
                      className="h-6 px-2 text-2xs text-primary-600"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Pay
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {bills.length === 0 && !loading && (
            <tr>
              <td colSpan={10} className="px-4 py-8 text-center text-gray-400 text-xs">
                {emptyText}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </DataCard>
  );
}
