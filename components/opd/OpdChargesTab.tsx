"use client";

import { useCurrency, useDateFormatter } from "@/lib/context";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import type { OpdVisitDetail, OpdPatientHistory } from "./types";

interface ChargeRow {
  id: string;
  date?: string;
  reference: string;
  name: string;
  fee: number;
  categoryName?: string | null;
  isCurrentVisit: boolean;
}

export function OpdChargesTab({
  visit,
  history,
}: {
  visit: OpdVisitDetail;
  history: OpdPatientHistory | null;
}) {
  const { fmt } = useCurrency();
  const { formatDate } = useDateFormatter();

  const applied = visit.appliedCharge ?? visit.totalFee ?? 0;
  const discount = visit.discount ?? 0;
  const taxPct = visit.tax ?? 0;
  const taxAmt = ((applied - discount) * taxPct) / 100;
  const net = visit.totalFee ?? applied - discount + taxAmt;

  // Patient-wide charge history across all OPD visits. The currently open
  // visit uses its own `charges` (the detail endpoint resolves categoryName;
  // the history endpoint doesn't). Falls back to the current visit alone
  // while history is still loading.
  const visits =
    history?.opd && history.opd.length > 0 ? history.opd : [visit];
  const rows: ChargeRow[] = visits
    .flatMap((v) => {
      const isCurrentVisit = v._id === visit._id;
      const charges = isCurrentVisit ? visit.charges : v.charges ?? [];
      return charges.map((c, i) => ({
        id: `${v._id}-${i}`,
        date: v.visitDate || v.createdAt,
        reference: `OPDN${String(v.opdNumber).padStart(4, "0")}`,
        name: c.name,
        fee: c.fee,
        categoryName: (c as { categoryName?: string | null }).categoryName,
        isCurrentVisit,
      }));
    })
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  const totalCharges = rows.reduce((s, r) => s + (r.fee || 0), 0);

  const columns: ColumnDef<ChargeRow>[] = [
    {
      key: "date",
      header: "Date",
      width: "w-28",
      sortable: true,
      sortValue: (c) => c.date ?? "",
      render: (c) => (
        <span className="text-xs text-gray-700 whitespace-nowrap">
          {c.date ? formatDate(c.date) : "—"}
        </span>
      ),
      csvValue: (c) => (c.date ? formatDate(c.date) : ""),
    },
    {
      key: "reference",
      header: "Reference",
      accessor: "reference",
      sortable: true,
      render: (c) => (
        <span className="text-xs font-medium text-gray-900 whitespace-nowrap">
          {c.reference}
          {c.isCurrentVisit && (
            <span className="ml-1.5 text-2xs font-semibold text-primary-600">
              (this visit)
            </span>
          )}
        </span>
      ),
      csvValue: (c) => c.reference,
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
        emptyText="No charges recorded for this patient."
        wrapperClassName="rounded-lg"
        downloadable
        printable
        fileName="OPD Charges"
      />

      {/* Summary */}
      <div className="border border-gray-200 rounded-lg bg-white p-4 max-w-sm ml-auto">
        <div className="flex justify-between text-sm font-semibold text-gray-900 pb-2 mb-3 border-b border-gray-200">
          <span>Total Charges (All Visits)</span>
          <span>{fmt(totalCharges)}</span>
        </div>
        <p className="text-2xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
          This Visit
        </p>
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
