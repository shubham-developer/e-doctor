"use client";

import { useCurrency, useDateFormatter } from "@/lib/context";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import type { OpdVisitDetail } from "./types";

interface ChargeRow {
  id: string;
  name: string;
  fee: number;
  categoryName?: string | null;
}

export function OpdChargesTab({ visit }: { visit: OpdVisitDetail }) {
  const { fmt } = useCurrency();
  const { formatDate } = useDateFormatter();

  const applied = visit.appliedCharge ?? visit.totalFee ?? 0;
  const discount = visit.discount ?? 0;
  const taxPct = visit.tax ?? 0;
  const taxAmt = ((applied - discount) * taxPct) / 100;
  const net = visit.totalFee ?? applied - discount + taxAmt;
  const visitDateLabel = formatDate(visit.visitDate || visit.createdAt);
  const rows: ChargeRow[] = visit.charges.map((c, i) => ({ id: String(i), ...c }));

  const columns: ColumnDef<ChargeRow>[] = [
    {
      key: "date",
      header: "Date",
      width: "w-28",
      render: () => (
        <span className="text-xs text-gray-700 whitespace-nowrap">
          {visitDateLabel}
        </span>
      ),
      csvValue: () => visitDateLabel,
    },
    {
      key: "name",
      header: "Charge Name",
      accessor: "name",
      sortable: true,
      render: (c) => (
        <span className="text-xs font-medium text-gray-900">{c.name}</span>
      ),
    },
    {
      key: "categoryName",
      header: "Category",
      accessor: "categoryName",
      render: (c) => (
        <span className="text-xs text-gray-700">{c.categoryName || "—"}</span>
      ),
      csvValue: (c) => c.categoryName ?? "",
    },
    {
      key: "fee",
      header: "Fee",
      align: "right",
      sortable: true,
      sortValue: (c) => c.fee,
      render: (c) => <span className="text-xs text-gray-700">{fmt(c.fee)}</span>,
      csvValue: (c) => String(c.fee),
    },
  ];

  return (
    <div className="p-4 space-y-4">
      <DataTable
        columns={columns}
        data={rows}
        rowKey={(c) => c.id}
        emptyText="No charges recorded for this visit."
        wrapperClassName="rounded-lg"
        downloadable
        printable
        fileName="OPD Charges"
      />

      {/* Summary */}
      <div className="border border-gray-200 rounded-lg bg-white p-4 max-w-sm ml-auto">
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-gray-600">
            <span>Applied Charge</span>
            <span>{fmt(applied)}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-600">
            <span>Discount</span>
            <span>− {fmt(discount)}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-600">
            <span>Tax ({taxPct}%)</span>
            <span>{fmt(taxAmt)}</span>
          </div>
          <div className="flex justify-between text-sm font-semibold text-gray-900 pt-1.5 border-t border-gray-200">
            <span>Net Amount</span>
            <span>{fmt(net)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
