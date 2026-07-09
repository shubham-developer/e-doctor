"use client";

import { useRouter } from "next/navigation";
import { useCurrency, useDateFormatter } from "@/lib/context";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import type { OpdVisit } from "./types";

export function OpdVisitsTab({ visits }: { visits: OpdVisit[] }) {
  const router = useRouter();
  const { fmt } = useCurrency();
  const { formatDate } = useDateFormatter();

  const sorted = [...visits].sort((a, b) =>
    (b.visitDate || b.createdAt).localeCompare(a.visitDate || a.createdAt),
  );

  const columns: ColumnDef<OpdVisit>[] = [
    {
      key: "opdNumber",
      header: "OPD No",
      sortable: true,
      sortValue: (v) => v.opdNumber,
      render: (v) => (
        <span className="text-xs font-semibold text-primary-700 whitespace-nowrap">
          OPDN{String(v.opdNumber).padStart(4, "0")}
        </span>
      ),
      csvValue: (v) => `OPDN${String(v.opdNumber).padStart(4, "0")}`,
    },
    {
      key: "visitDate",
      header: "Appt. Date",
      sortable: true,
      sortValue: (v) => (v.visitDate ? new Date(v.visitDate) : new Date(0)),
      render: (v) => (
        <span className="text-xs text-gray-700 whitespace-nowrap">
          {v.visitDate ? formatDate(v.visitDate) : "—"}
        </span>
      ),
      csvValue: (v) => (v.visitDate ? formatDate(v.visitDate) : ""),
    },
    {
      key: "doctorId",
      header: "Consultant",
      render: (v) => (
        <span className="text-xs text-gray-700">
          {v.doctorId?.name ?? "—"}
        </span>
      ),
      csvValue: (v) => v.doctorId?.name ?? "",
    },
    {
      key: "chiefComplaint",
      header: "Symptoms",
      accessor: "chiefComplaint",
      render: (v) => (
        <span className="text-xs text-gray-700 max-w-60 truncate block">
          {v.chiefComplaint || "—"}
        </span>
      ),
      csvValue: (v) => v.chiefComplaint ?? "",
    },
    {
      key: "totalFee",
      header: "Total",
      align: "right",
      sortable: true,
      sortValue: (v) => v.totalFee ?? 0,
      render: (v) => (
        <span className="text-xs text-gray-700">{fmt(v.totalFee ?? 0)}</span>
      ),
      csvValue: (v) => String(v.totalFee ?? 0),
    },
    {
      key: "paidAmount",
      header: "Paid",
      align: "right",
      sortable: true,
      sortValue: (v) => v.paidAmount ?? 0,
      render: (v) => (
        <span className="text-xs text-gray-700">{fmt(v.paidAmount ?? 0)}</span>
      ),
      csvValue: (v) => String(v.paidAmount ?? 0),
    },
  ];

  return (
    <div className="p-4">
      <DataTable
        columns={columns}
        data={sorted}
        rowKey={(v) => v._id}
        onRowClick={(v) => router.push(`/dashboard/opd/${v._id}`)}
        emptyText="No OPD visits found for this patient."
        wrapperClassName="rounded-lg"
        downloadable
        printable
        fileName="OPD Visits"
      />
    </div>
  );
}
