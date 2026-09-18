"use client";

import { ReportTable, type ReportTableControls } from "./ReportTable";
import { useDateFormatter } from "@/lib/context";
import type { ColumnDef } from "@/components/ui/data-table";
import type { OpdVisit } from "./types";

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  new: { label: "New", cls: "bg-primary-100 text-primary-700" },
  free_revisit: { label: "Free Revisit", cls: "bg-green-100 text-green-700" },
  paid_revisit: { label: "Revisit", cls: "bg-amber-100 text-amber-700" },
};

function visitStatusOf(r: OpdVisit): string {
  return r.visitStatus ?? (r.isReturning ? "free_revisit" : "new");
}

function daysNote(r: OpdVisit): string {
  if (visitStatusOf(r) === "new" || r.daysSinceLastVisit == null) return "";
  return r.daysSinceLastVisit === 0
    ? "same day"
    : `after ${r.daysSinceLastVisit} day${r.daysSinceLastVisit !== 1 ? "s" : ""}`;
}

export function OpdReport({
  rows,
  total,
  totalAmount,
  freeRevisitCount,
  paidRevisitCount,
  fmt,
  controls,
}: {
  rows: OpdVisit[];
  /** Range-wide totals from the API — `rows` only holds the current page. */
  total: number;
  totalAmount: number;
  freeRevisitCount: number;
  paidRevisitCount: number;
  fmt: (n: number) => string;
  controls: ReportTableControls<OpdVisit>;
}) {
  const { formatDate } = useDateFormatter();
  const newCount = total - freeRevisitCount - paidRevisitCount;

  const columns: ColumnDef<OpdVisit>[] = [
    {
      key: "date",
      header: "Date",
      sortable: true,
      render: (r) => formatDate(r.visitDate.split("T")[0]),
      csvValue: (r) => formatDate(r.visitDate.split("T")[0]),
    },
    {
      key: "patient",
      header: "Patient",
      render: (r) => (
        <div>
          <div className="font-medium">{r.patientId?.name ?? "—"}</div>
          {r.patientId?.uhid && (
            <div className="text-gray-400">{r.patientId.uhid}</div>
          )}
        </div>
      ),
      csvValue: (r) =>
        r.patientId
          ? `${r.patientId.name}${r.patientId.uhid ? ` (${r.patientId.uhid})` : ""}`
          : "—",
    },
    {
      key: "ageGender",
      header: "Age / Gender",
      render: (r) =>
        `${r.patientId?.age ?? "—"} / ${r.patientId?.gender ?? "—"}`,
      csvValue: (r) =>
        `${r.patientId?.age ?? "—"} / ${r.patientId?.gender ?? "—"}`,
    },
    {
      key: "doctor",
      header: "Doctor",
      render: (r) => r.doctorId?.name ?? "—",
      csvValue: (r) => r.doctorId?.name ?? "—",
    },
    {
      key: "type",
      header: "Type",
      render: (r) => {
        const badge = STATUS_BADGE[visitStatusOf(r)] ?? STATUS_BADGE.new;
        const note = daysNote(r);
        return (
          <>
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-medium ${badge.cls}`}
            >
              {badge.label}
            </span>
            {note && (
              <span className="ml-1 text-2xs text-gray-400">{note}</span>
            )}
          </>
        );
      },
      csvValue: (r) => {
        const label = (STATUS_BADGE[visitStatusOf(r)] ?? STATUS_BADGE.new)
          .label;
        const note = daysNote(r);
        return note ? `${label} (${note})` : label;
      },
    },
    {
      key: "mode",
      header: "Payment Mode",
      render: (r) => (
        <span className="capitalize">{r.paymentMode ?? "Cash"}</span>
      ),
      csvValue: (r) => r.paymentMode ?? "Cash",
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      sortable: true,
      render: (r) => (
        <span className="text-success-700">{fmt(r.paidAmount)}</span>
      ),
      csvValue: (r) => String(r.paidAmount ?? 0),
    },
  ];

  return (
    <div className="space-y-3">
      {total > 0 && (
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-primary-500 shrink-0" />
            <div>
              <p className="text-xs text-gray-500">New</p>
              <p className="text-lg font-bold text-gray-900">{newCount}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 bg-white border border-green-200 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Free Revisit</p>
              <p className="text-lg font-bold text-green-700">
                {freeRevisitCount}
              </p>
            </div>
          </div>
          {paidRevisitCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-white border border-amber-200 rounded-lg">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Revisit (Charged)</p>
                <p className="text-lg font-bold text-amber-700">
                  {paidRevisitCount}
                </p>
              </div>
            </div>
          )}
          {freeRevisitCount + paidRevisitCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg">
              <div>
                <p className="text-xs text-gray-500">Return Rate</p>
                <p className="text-lg font-bold text-gray-700">
                  {Math.round(
                    ((freeRevisitCount + paidRevisitCount) / total) * 100,
                  )}
                  %
                </p>
              </div>
            </div>
          )}
        </div>
      )}
      <ReportTable
        title="OPD Report"
        footer={`${total} visits · ${newCount} new · ${freeRevisitCount} free revisit${freeRevisitCount !== 1 ? "s" : ""}${paidRevisitCount > 0 ? ` · ${paidRevisitCount} charged revisit${paidRevisitCount !== 1 ? "s" : ""}` : ""} · Total: ${fmt(totalAmount)}`}
        columns={columns}
        data={rows}
        rowKey={(r) => r._id}
        total={total}
        controls={controls}
        itemLabel="visits"
      />
    </div>
  );
}
