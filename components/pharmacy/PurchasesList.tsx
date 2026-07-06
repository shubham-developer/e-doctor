"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { TablePagination } from "@/components/common/TablePagination";
import { useApp, formatAmount } from "@/lib/context";
import { useApiQuery } from "@/lib/useApiQuery";

interface PharmacyPurchase {
  _id: string;
  purchaseNo: number;
  billNo?: string;
  purchaseDate: string;
  supplierName: string;
  totalAmount: number;
  discountAmount: number;
  taxAmount: number;
  netAmount: number;
}

function getPurchaseColumns(
  symbol: string,
  currency?: string,
): ColumnDef<PharmacyPurchase>[] {
  const fmt = (n: number) => formatAmount(n, currency);
  return [
    {
      key: "purchaseNo",
      header: "Purchase No",
      sortable: true,
      sortValue: (p) => p.purchaseNo,
      skeletonWidth: "w-24",
      csvValue: (p) => `PCHNO${p.purchaseNo}`,
      render: (p) => (
        <span className="text-xs font-medium text-primary-600 whitespace-nowrap">
          PCHNO{p.purchaseNo}
        </span>
      ),
    },
    {
      key: "purchaseDate",
      header: "Purchase Date",
      sortable: true,
      sortValue: (p) => new Date(p.purchaseDate),
      skeletonWidth: "w-32",
      csvValue: (p) => format(new Date(p.purchaseDate), "MM/dd/yyyy hh:mm a"),
      render: (p) => (
        <span className="text-xs whitespace-nowrap text-gray-600">
          {format(new Date(p.purchaseDate), "MM/dd/yyyy hh:mm a")}
        </span>
      ),
    },
    {
      key: "billNo",
      header: "Bill No",
      sortable: true,
      sortValue: (p) => p.billNo ?? "",
      skeletonWidth: "w-16",
      csvValue: (p) => p.billNo ?? "",
      render: (p) => (
        <span className="text-xs text-gray-600">{p.billNo ?? "—"}</span>
      ),
    },
    {
      key: "supplierName",
      header: "Supplier Name",
      sortable: true,
      sortValue: (p) => p.supplierName,
      skeletonWidth: "w-28",
      csvValue: (p) => p.supplierName,
      render: (p) => (
        <span className="text-xs text-gray-800">{p.supplierName}</span>
      ),
    },
    {
      key: "totalAmount",
      header: `Total (${symbol})`,
      align: "right",
      sortable: true,
      sortValue: (p) => p.totalAmount,
      skeletonWidth: "w-16",
      csvValue: (p) => fmt(p.totalAmount),
      render: (p) => (
        <span className="text-xs text-gray-700">{fmt(p.totalAmount)}</span>
      ),
    },
    {
      key: "discountAmount",
      header: `Discount (${symbol})`,
      align: "right",
      skeletonWidth: "w-20",
      csvValue: (p) => fmt(p.discountAmount),
      render: (p) => (
        <span className="text-xs text-gray-700">{`${fmt(p.discountAmount)} (${p.totalAmount > 0 ? fmt((p.discountAmount / p.totalAmount) * 100) : "0.00"}%)`}</span>
      ),
    },
    {
      key: "taxAmount",
      header: `Tax (${symbol})`,
      align: "right",
      skeletonWidth: "w-16",
      csvValue: (p) => fmt(p.taxAmount),
      render: (p) => (
        <span className="text-xs text-gray-700">{`${fmt(p.taxAmount)} (${p.totalAmount > 0 ? fmt((p.taxAmount / p.totalAmount) * 100) : "0.00"}%)`}</span>
      ),
    },
    {
      key: "netAmount",
      header: `Net Amount (${symbol})`,
      align: "right",
      sortable: true,
      sortValue: (p) => p.netAmount,
      skeletonWidth: "w-20",
      csvValue: (p) => fmt(p.netAmount),
      render: (p) => (
        <span className="text-xs font-medium text-gray-800">
          {fmt(p.netAmount)}
        </span>
      ),
    },
  ];
}

export function PurchasesList({
  onAddPurchase,
  refreshToken,
}: {
  onAddPurchase: () => void;
  refreshToken: number;
}) {
  const { tenant } = useApp();
  const symbol = tenant?.currencySymbol || "₹";
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 100;

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data: purchasesData, isPending: loading } = useApiQuery<{
    purchases: PharmacyPurchase[];
    total: number;
    totalPages: number;
  }>(
    ["pharmacy-purchases", search, page, refreshToken],
    `/api/dashboard/pharmacy/purchases?search=${encodeURIComponent(search)}&page=${page}&limit=${limit}`,
    { keepPrevious: true },
  );
  const purchases = purchasesData?.purchases ?? [];
  const total = purchasesData?.total ?? 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b">
        <h1 className="text-lg font-semibold text-gray-800">
          Medicine Purchase List
        </h1>
        <div className="ml-auto">
          <Button
            size="sm"
            onClick={onAddPurchase}
            className="bg-primary-600 hover:bg-primary-700 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Purchase Medicine
          </Button>
        </div>
      </div>

      <DataTable<PharmacyPurchase>
        columns={getPurchaseColumns(symbol, tenant?.currency)}
        data={purchases}
        rowKey={(p) => p._id}
        loading={loading}
        skeletonRows={8}
        emptyText="No purchases found"
        wrapperClassName="flex-1 overflow-auto"
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        toolbarRight={
          <span className="text-xs text-gray-400">{total} records</span>
        }
        downloadable
        printable
        fileName="pharmacy-purchases"
      />

      <TablePagination
        page={page}
        total={total}
        limit={limit}
        onPageChange={setPage}
        itemLabel="purchases"
        className="shrink-0 rounded-none border-x-0 border-b-0"
      />
    </div>
  );
}
