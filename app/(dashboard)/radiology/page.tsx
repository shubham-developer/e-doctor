"use client";

import { useEffect, useState } from "react";
import { useApiQuery } from "@/lib/useApiQuery";
import { useApp, useCurrency } from "@/lib/context";
import { Button } from "@/components/ui/button";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { Plus, Search, Printer } from "lucide-react";
import { useRouter } from "next/navigation";
import { printRadiologyBillReceipt } from "@/components/radiology/RadiologyBillPrinter";
import { GenerateBillDialog } from "@/components/radiology/GenerateBillDialog";
import { RadiologyResultsDialog } from "@/components/radiology/ResultsDialog";
import type { RadiologyBill } from "@/components/radiology/types";

export default function RadiologyPage() {
  const { user, tenant } = useApp();
  const { sym } = useCurrency();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState(""); // debounced — drives the fetch
  const [showAdd, setShowAdd] = useState(false);
  const [resultBill, setResultBill] = useState<RadiologyBill | null>(null);
  const canEdit = user?.role !== "VIEWER";

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setSearch(searchInput);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const {
    data: billsData,
    isPending: loading,
    refetch: load,
  } = useApiQuery<{ bills: RadiologyBill[]; total: number }>(
    ["radiology-bills", search, page],
    `/api/dashboard/radiology/bills?page=${page}&limit=25${search ? `&search=${encodeURIComponent(search)}` : ""}`,
    { keepPrevious: true },
  );
  const bills = billsData?.bills ?? [];
  const total = billsData?.total ?? 0;

  function handlePrint(b: RadiologyBill) {
    const taxTotal = b.items.reduce((s, i) => s + (i.charge * i.tax) / 100, 0);
    printRadiologyBillReceipt({
      billNo: b.billNo,
      billDate: b.billDate,
      caseId: b.caseId,
      patientName: b.patientId?.name,
      uhid: b.patientId?.uhid,
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
      clinicPhone: tenant?.phone,
      logoUrl: tenant?.logoUrl,
      printLayouts: tenant?.printLayouts,
      printShowLogo: tenant?.printShowLogo,
      currencySymbol: sym,
    });
  }

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
      key: "result",
      header: "Result",
      width: "w-28",
      render: (b) => (
        <button
          onClick={() => setResultBill(b)}
          className={`text-2xs px-2 py-0.5 rounded-full font-medium border transition-colors ${
            b.resultStatus === "completed"
              ? "bg-success-50 text-success-700 border-success-200 hover:bg-success-100"
              : "bg-warning-50 text-warning-700 border-warning-200 hover:bg-warning-100"
          }`}
        >
          {b.resultStatus === "completed" ? "Completed" : "Pending"}
        </button>
      ),
    },
    {
      key: "print",
      header: "",
      width: "w-10",
      render: (b) => (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => handlePrint(b)}
          title="Print bill"
          className="text-gray-400 hover:text-primary-600 hover:bg-primary-50"
        >
          <Printer className="w-3.5 h-3.5" />
        </Button>
      ),
    },
  ];

  return (
    <>
      {showAdd && (
        <GenerateBillDialog
          onClose={() => setShowAdd(false)}
          onSaved={() => load()}
          clinicName={tenant?.name ?? "Clinic"}
          clinicAddress={tenant?.address}
          clinicPhone={tenant?.phone}
          logoUrl={tenant?.logoUrl}
        />
      )}
      {resultBill && (
        <RadiologyResultsDialog
          bill={resultBill}
          clinicName={tenant?.name ?? "Clinic"}
          clinicAddress={tenant?.address}
          clinicPhone={tenant?.phone}
          logoUrl={tenant?.logoUrl}
          printLayouts={tenant?.printLayouts}
          printShowLogo={tenant?.printShowLogo}
          printHeaderImages={tenant?.printHeaderImages}
          printFooterContents={tenant?.printFooterContents}
          onClose={() => setResultBill(null)}
          onSaved={() => load()}
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
              onClick={() => router.push("/radiology/tests")}
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
          searchValue={searchInput}
          onSearchChange={setSearchInput}
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
              <Button
                variant="outline"
                size="xs"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Prev
              </Button>
              <span className="text-xs text-gray-500 px-1">Page {page}</span>
              <Button
                variant="outline"
                size="xs"
                disabled={bills.length < 25}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
