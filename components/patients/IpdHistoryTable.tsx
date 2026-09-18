"use client";

import { useRouter } from "next/navigation";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { useCurrency, useDateFormatter } from "@/lib/context";
import type { IpdAdmission } from "./types";

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ADMITTED: "bg-primary-100 text-primary-700",
    DISCHARGED: "bg-success-100 text-success-700",
  };
  return (
    <span
      className={`inline-flex px-1.5 py-0.5 rounded text-2xs font-semibold ${colors[status] ?? "bg-gray-100 text-gray-600"}`}
    >
      {status}
    </span>
  );
}

export function IpdHistoryTable({
  admissions,
  loading,
}: {
  admissions: IpdAdmission[];
  loading: boolean;
}) {
  const router = useRouter();
  const { fmt } = useCurrency();
  const { formatDate } = useDateFormatter();

  const columns: ColumnDef<IpdAdmission>[] = [
    {
      key: "admissionDate",
      header: "Admission Date",
      width: "w-28",
      skeletonWidth: "w-20",
      render: (a) => (
        <span className="text-xs text-gray-700">
          {formatDate(a.admissionDate.split("T")[0])}
        </span>
      ),
    },
    {
      key: "dischargeDate",
      header: "Discharge",
      width: "w-24",
      skeletonWidth: "w-20",
      render: (a) => (
        <span className="text-xs text-gray-500">
          {a.dischargeDate ? formatDate(a.dischargeDate.split("T")[0]) : "—"}
        </span>
      ),
    },
    {
      key: "doctor",
      header: "Doctor",
      skeletonWidth: "w-28",
      render: (a) => (
        <span className="text-xs text-gray-700">{a.doctorId?.name ?? "—"}</span>
      ),
    },
    {
      key: "bed",
      header: "Bed",
      width: "w-24",
      skeletonWidth: "w-16",
      render: (a) => (
        <span className="text-xs text-gray-500">
          {[a.bedGroup, a.bedNumber].filter(Boolean).join(" / ") || "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "w-20",
      skeletonWidth: "w-16",
      render: (a) => <StatusBadge status={a.status} />,
    },
    {
      key: "creditLimit",
      header: "Credit Limit",
      align: "right",
      width: "w-24",
      skeletonWidth: "w-16",
      render: (a) => (
        <span className="text-xs font-mono text-gray-700">
          {a.creditLimit ? fmt(a.creditLimit) : "—"}
        </span>
      ),
    },
  ];

  return (
    <DataTable<IpdAdmission>
      columns={columns}
      data={admissions}
      rowKey={(a) => a._id}
      loading={loading}
      emptyText="No IPD admissions found"
      wrapperClassName="border-0"
      onRowClick={(a) => router.push(`/ipd/${a._id}`)}
    />
  );
}
