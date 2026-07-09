"use client";

import { BedDouble } from "lucide-react";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { useDateFormatter } from "@/lib/context";
import type { BedHistoryEntry } from "@/components/ipd/types";

export function BedHistoryTab({ history }: { history: BedHistoryEntry[] }) {
  const { formatDateTime } = useDateFormatter();
  const fmtDateTime = (value?: string) => (value ? formatDateTime(value) : "—");

  const columns: ColumnDef<BedHistoryEntry>[] = [
    {
      key: "bedGroup",
      header: "Bed Group",
      accessor: "bedGroup",
      sortable: true,
      render: (e) => (
        <span className="text-xs text-gray-700">{e.bedGroup || "—"}</span>
      ),
    },
    {
      key: "bedNumber",
      header: "Bed",
      accessor: "bedNumber",
      sortable: true,
      render: (e) => (
        <span className="text-xs font-medium text-gray-800">
          {e.bedNumber || "—"}
        </span>
      ),
    },
    {
      key: "fromDate",
      header: "From Date",
      sortable: true,
      sortValue: (e) => (e.fromDate ? new Date(e.fromDate) : new Date(0)),
      render: (e) => (
        <span className="text-xs text-gray-500">
          {fmtDateTime(e.fromDate)}
        </span>
      ),
      csvValue: (e) => fmtDateTime(e.fromDate),
    },
    {
      key: "toDate",
      header: "To Date",
      sortable: true,
      sortValue: (e) => (e.toDate ? new Date(e.toDate) : new Date(0)),
      render: (e) => (
        <span className="text-xs text-gray-500">
          {fmtDateTime(e.toDate)}
        </span>
      ),
      csvValue: (e) => fmtDateTime(e.toDate),
    },
    {
      key: "isActive",
      header: "Active Bed",
      width: "w-28",
      render: (e) =>
        e.isActive ? (
          <span className="inline-flex px-2 py-0.5 rounded text-2xs font-semibold bg-success-100 text-success-700">
            Yes
          </span>
        ) : (
          <span className="inline-flex px-2 py-0.5 rounded text-2xs font-semibold bg-gray-100 text-gray-500">
            No
          </span>
        ),
      csvValue: (e) => (e.isActive ? "Yes" : "No"),
    },
  ];

  return (
    <div className="p-4">
      <DataTable
        columns={columns}
        data={history}
        rowKey={(e) => `${e.bedNumber ?? "bed"}-${e.fromDate}`}
        emptyNode={
          <div className="flex flex-col items-center justify-center gap-2">
            <BedDouble className="w-10 h-10 opacity-20" />
            <p className="text-sm">No bed history recorded</p>
            <p className="text-xs text-gray-300">
              Bed history is tracked when a bed is assigned or changed
            </p>
          </div>
        }
        wrapperClassName="rounded-lg"
        downloadable
        printable
        fileName="IPD Bed History"
      />
    </div>
  );
}
