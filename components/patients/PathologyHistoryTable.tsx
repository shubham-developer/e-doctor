"use client";

import { Printer } from "lucide-react";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { useApp, useCurrency } from "@/lib/context";
import { formatDateTime } from "@/lib/format";
import { printPathologyBillReceipt } from "@/components/pathology/PathologyBillPrinter";
import type { PatientPathologyBill, Patient } from "./types";

export function PathologyHistoryTable({
  bills,
  patient,
  loading,
}: {
  bills: PatientPathologyBill[];
  patient: Patient | null;
  loading: boolean;
}) {
  const { tenant } = useApp();
  const { sym, fmt } = useCurrency();

  function printBill(bill: PatientPathologyBill) {
    if (!patient) return;
    const taxTotal = bill.items.reduce(
      (s, i) => s + (i.charge * i.tax) / 100,
      0,
    );
    printPathologyBillReceipt({
      billNo: bill.billNo,
      billDate: bill.createdAt ? formatDateTime(bill.createdAt) : bill.billDate,
      caseId: bill.caseId,
      patientName: patient.name,
      uhid: patient.uhid ? String(patient.uhid) : undefined,
      referenceDoctor: bill.referenceDoctor,
      note: bill.note,
      previousReportValue: bill.previousReportValue,
      items: bill.items,
      totalAmount: bill.amount,
      discountAmount: bill.discount,
      taxAmount: taxTotal,
      netAmount: bill.netAmount,
      paidAmount: bill.paidAmount,
      balance: bill.balance,
      paymentMode: bill.paymentMode,
      clinicName: tenant?.name ?? "Clinic",
      clinicAddress: tenant?.address,
      clinicPhone: tenant?.phone,
      logoUrl: tenant?.logoUrl,
      printLayouts: tenant?.printLayouts,
      printShowLogo: tenant?.printShowLogo,
      printHeaderImages: tenant?.printHeaderImages,
      printFooterContents: tenant?.printFooterContents,
      printLetterheads: tenant?.printLetterheads,
      printShowTitles: tenant?.printShowTitles,
      printTitleTexts: tenant?.printTitleTexts,
      currencySymbol: sym,
    });
  }

  const columns: ColumnDef<PatientPathologyBill>[] = [
    {
      key: "billNo",
      header: "Bill No",
      width: "w-24",
      skeletonWidth: "w-20",
      render: (b) => (
        <span className="text-xs font-mono text-primary-700">{b.billNo}</span>
      ),
    },
    {
      key: "billDate",
      header: "Date",
      width: "w-24",
      skeletonWidth: "w-20",
      render: (b) => (
        <span className="text-xs text-gray-500">{b.billDate}</span>
      ),
    },
    {
      key: "tests",
      header: "Tests",
      align: "center",
      width: "w-14",
      skeletonWidth: "w-8",
      render: (b) => (
        <span className="text-xs text-gray-600">{b.items?.length ?? 0}</span>
      ),
    },
    {
      key: "referenceDoctor",
      header: "Ref. Doctor",
      skeletonWidth: "w-28",
      render: (b) => (
        <span className="text-xs text-gray-500">
          {b.referenceDoctor || "—"}
        </span>
      ),
    },
    {
      key: "netAmount",
      header: "Net Amount",
      align: "right",
      width: "w-24",
      skeletonWidth: "w-16",
      render: (b) => (
        <span className="text-xs font-mono text-gray-800">
          {fmt(b.netAmount)}
        </span>
      ),
    },
    {
      key: "paid",
      header: "Paid",
      align: "right",
      width: "w-24",
      skeletonWidth: "w-16",
      render: (b) => (
        <span className="text-xs font-mono text-success-700">
          {fmt(b.paidAmount)}
        </span>
      ),
    },
    {
      key: "balance",
      header: "Balance",
      align: "right",
      width: "w-24",
      skeletonWidth: "w-16",
      render: (b) => (
        <span
          className={`text-xs font-mono font-semibold ${b.balance > 0 ? "text-danger-600" : "text-success-600"}`}
        >
          {fmt(b.balance)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "center",
      width: "w-10",
      skeletonWidth: "w-6",
      render: (b) => (
        <button
          onClick={() => printBill(b)}
          title="Print"
          className="p-1 rounded hover:bg-primary-50 text-gray-400 hover:text-primary-600"
        >
          <Printer className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ];

  return (
    <DataTable<PatientPathologyBill>
      columns={columns}
      data={bills}
      rowKey={(b) => b._id}
      loading={loading}
      emptyText="No pathology bills found"
      wrapperClassName="border-0"
    />
  );
}
