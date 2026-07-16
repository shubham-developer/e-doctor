"use client";

import { Printer } from "lucide-react";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { useApp, useCurrency, useDateFormatter } from "@/lib/context";
import { formatDateTime } from "@/lib/format";
import { printPharmacyBillReceipt } from "@/components/pharmacy/PharmacyBillPrinter";
import type { PatientPharmacyBill, Patient } from "./types";

export function PharmacyHistoryTable({
  bills,
  patient,
  loading,
}: {
  bills: PatientPharmacyBill[];
  patient: Patient | null;
  loading: boolean;
}) {
  const { tenant } = useApp();
  const { fmt } = useCurrency();
  const { formatDate } = useDateFormatter();

  function printBill(bill: PatientPharmacyBill) {
    if (!patient) return;
    printPharmacyBillReceipt({
      billNumber: bill.billNumber,
      billDate: bill.createdAt ? formatDateTime(bill.createdAt) : "",
      patientName: patient.name,
      uhid: patient.uhid ? String(patient.uhid) : undefined,
      doctorName: bill.doctorName,
      lines: (bill.lines ?? []).map((l) => ({
        medicineName: l.medicineName,
        batchNo: l.batchNo,
        expiryDate: l.expiryDate,
        quantity: l.quantity,
        salePrice: l.salePrice,
        taxPercent: l.taxPercent,
        discountPercent: l.discountPercent,
        amount: l.amount,
      })),
      totalAmount: bill.totalAmount,
      discountAmount: bill.discountAmount,
      taxAmount: bill.taxAmount,
      netAmount: bill.netAmount,
      paidAmount: bill.paidAmount,
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
    });
  }

  const columns: ColumnDef<PatientPharmacyBill>[] = [
    {
      key: "billNumber",
      header: "Bill No",
      width: "w-28",
      skeletonWidth: "w-20",
      render: (b) => (
        <span className="text-xs font-mono text-primary-700">
          PHARMAB{b.billNumber}
        </span>
      ),
    },
    {
      key: "date",
      header: "Date",
      width: "w-24",
      skeletonWidth: "w-20",
      render: (b) => (
        <span className="text-xs text-gray-500">
          {b.createdAt ? formatDate(b.createdAt) : "—"}
        </span>
      ),
    },
    {
      key: "items",
      header: "Items",
      align: "center",
      width: "w-14",
      skeletonWidth: "w-8",
      render: (b) => (
        <span className="text-xs text-gray-600">{b.lines?.length ?? 0}</span>
      ),
    },
    {
      key: "doctor",
      header: "Doctor",
      skeletonWidth: "w-28",
      render: (b) => (
        <span className="text-xs text-gray-500">{b.doctorName || "—"}</span>
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
      render: (b) => {
        const balance = b.netAmount - b.paidAmount;
        return (
          <span
            className={`text-xs font-mono font-semibold ${balance > 0 ? "text-danger-600" : "text-success-600"}`}
          >
            {fmt(balance)}
          </span>
        );
      },
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
    <DataTable<PatientPharmacyBill>
      columns={columns}
      data={bills}
      rowKey={(b) => b._id}
      loading={loading}
      emptyText="No pharmacy bills found"
      wrapperClassName="border-0"
    />
  );
}
