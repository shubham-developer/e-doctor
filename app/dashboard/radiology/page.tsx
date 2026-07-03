"use client";

import { useEffect, useState, useCallback } from "react";
import { useApp, useCurrency } from "@/lib/context";
import { Button } from "@/components/ui/button";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { Plus, Search, Printer } from "lucide-react";
import { useRouter } from "next/navigation";
import { printRadiologyBillReceipt } from "@/components/radiology/RadiologyBillPrinter";
import { GenerateBillDialog } from "@/components/radiology/GenerateBillDialog";
import { apiClient } from "@/lib/apiClient";
import type { RadiologyBill } from "@/components/radiology/types";

export default function RadiologyPage() {
  const { user, tenant } = useApp();
  const { sym } = useCurrency();
  const router = useRouter();
  const [bills, setBills] = useState<RadiologyBill[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const canEdit = user?.role !== "VIEWER";

  function handlePrint(b: RadiologyBill) {
    const taxTotal = b.items.reduce((s, i) => s + (i.charge * i.tax) / 100, 0);
    printRadiologyBillReceipt({
      billNo: b.billNo,
      billDate: b.billDate,
      caseId: b.caseId,
      patientName: b.patientId?.name,
      patientCode: b.patientId?.patientCode,
      referenceDoctor: b.referenceDoctor,
      note: b.note,
      previousReportValue: b.previousReportValue,
      items: b.items,
      totalAmount: b.amount,
      discountAmount: b.discount,
      taxAmount: taxTotal,
      netAmount: b.netAmount,
      paidAmount: b.paidAmount,
      balance: b.balance,
      paymentMode: b.paymentMode,
      clinicName: tenant?.name ?? "Clinic",
      clinicAddress: tenant?.address,
      clinicPhone: tenant?.whatsappNumber,
      logoUrl: tenant?.logoUrl,
      printLayouts: tenant?.printLayouts,
      currencySymbol: sym,
    });
  }

  const load = useCallback(
    async (p = page) => {
      setLoading(true);
      const res = await apiClient.get<{
        bills: RadiologyBill[];
        total: number;
      }>(
        `/api/dashboard/radiology/bills?page=${p}&limit=25${search ? `&search=${encodeURIComponent(search)}` : ""}`,
      );
      if (res.success) {
        setBills(res.data?.bills ?? []);
        setTotal(res.data?.total ?? 0);
      }
      setLoading(false);
    },
    [page, search],
  );

  useEffect(() => {
    load();
  }, [load]);

  const columns: ColumnDef<RadiologyBill>[] = [
    {
      key: "billNo",
      header: "Bill No",
      width: "w-28",
      sortable: true,
      sortValue: (b) => b.billNumber,
      render: (b) => (
        <span className="text-xs font-mono font-medium text-primary-700">
          {b.billNo}
        </span>
      ),
    },
    {
      key: "patient",
      header: "Patient",
      sortable: true,
      sortValue: (b) => b.patientId?.name ?? "",
      render: (b) => (
        <span className="text-xs font-medium text-gray-900">
          {b.patientId?.name ?? "—"}
        </span>
      ),
    },
    {
      key: "date",
      header: "Bill Date",
      width: "w-28",
      render: (b) => (
        <span className="text-xs text-gray-500">{b.billDate}</span>
      ),
    },
    {
      key: "ref",
      header: "Reference Doctor",
      width: "w-36",
      render: (b) => (
        <span className="text-xs text-gray-500">
          {b.referenceDoctor || "—"}
        </span>
      ),
    },
    {
      key: "tests",
      header: "Tests",
      width: "w-16",
      align: "center",
      render: (b) => (
        <span className="text-xs text-gray-600">{b.items.length}</span>
      ),
    },
    {
      key: "amount",
      header: `Amount (${sym})`,
      width: "w-24",
      align: "right",
      sortable: true,
      sortValue: (b) => b.amount,
      render: (b) => (
        <span className="text-xs font-mono text-gray-700">
          {b.amount.toFixed(2)}
        </span>
      ),
    },
    {
      key: "discount",
      header: `Disc (${sym})`,
      width: "w-20",
      align: "right",
      render: (b) => (
        <span className="text-xs font-mono text-gray-500">
          {b.discount.toFixed(2)}
        </span>
      ),
    },
    {
      key: "net",
      header: `Net (${sym})`,
      width: "w-24",
      align: "right",
      sortable: true,
      sortValue: (b) => b.netAmount,
      render: (b) => (
        <span className="text-xs font-mono font-semibold text-gray-800">
          {b.netAmount.toFixed(2)}
        </span>
      ),
    },
    {
      key: "paid",
      header: `Paid (${sym})`,
      width: "w-24",
      align: "right",
      render: (b) => (
        <span className="text-xs font-mono text-success-700">
          {b.paidAmount.toFixed(2)}
        </span>
      ),
    },
    {
      key: "balance",
      header: `Balance (${sym})`,
      width: "w-24",
      align: "right",
      sortable: true,
      sortValue: (b) => b.balance,
      render: (b) => (
        <span
          className={`text-xs font-mono font-semibold ${b.balance > 0 ? "text-danger-600" : "text-success-600"}`}
        >
          {b.balance.toFixed(2)}
        </span>
      ),
    },
    {
      key: "print",
      header: "",
      width: "w-10",
      render: (b) => (
        <button
          onClick={() => handlePrint(b)}
          title="Print bill"
          className="p-1.5 rounded hover:bg-primary-50 text-gray-400 hover:text-primary-600 transition-colors"
        >
          <Printer className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ];

  return (
    <>
      {showAdd && (
        <GenerateBillDialog
          onClose={() => setShowAdd(false)}
          onSaved={(saved) => setBills((prev) => [saved, ...prev])}
          clinicName={tenant?.name ?? "Clinic"}
          clinicAddress={tenant?.address}
          clinicPhone={tenant?.whatsappNumber}
          logoUrl={tenant?.logoUrl}
        />
      )}

      <div className="h-full flex flex-col bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 shrink-0 bg-gray-50 px-3 py-2">
          <h1 className="text-lg font-semibold text-gray-800">
            Radiology Bills
          </h1>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1"
              onClick={() => router.push("/dashboard/radiology/tests")}
            >
              <Search className="w-3.5 h-3.5" /> Radiology Tests
            </Button>
            {canEdit && (
              <Button
                size="sm"
                className="h-8 text-xs gap-1 bg-primary-600 hover:bg-primary-700"
                onClick={() => setShowAdd(true)}
              >
                <Plus className="w-3.5 h-3.5" /> Generate Bill
              </Button>
            )}
          </div>
        </div>

        <DataTable<RadiologyBill>
          columns={columns}
          data={bills}
          rowKey={(b) => b._id}
          loading={loading}
          skeletonRows={6}
          wrapperClassName="flex-1 overflow-auto"
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search bills…"
          downloadable
          printable
          fileName="radiology-bills"
          emptyText="No radiology bills found. Click '+ Generate Bill' to create one."
        />

        <div className="px-3 py-1.5 border-t border-gray-200 shrink-0 bg-gray-50 flex items-center gap-4">
          <span className="text-xs text-gray-500">
            Records: {bills.length} of {total}
          </span>
          {total > 25 && (
            <div className="flex items-center gap-1 ml-auto">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-2 py-0.5 text-xs border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-40"
              >
                Prev
              </button>
              <span className="text-xs text-gray-500 px-1">Page {page}</span>
              <button
                disabled={bills.length < 25}
                onClick={() => setPage((p) => p + 1)}
                className="px-2 py-0.5 text-xs border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
