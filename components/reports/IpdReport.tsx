"use client";

import { ReportTable, type ReportTableControls } from "./ReportTable";
import { useDateFormatter } from "@/lib/context";
import type { ColumnDef } from "@/components/ui/data-table";
import type { IpdAdm } from "./types";

export function IpdReport({
  ipdRows,
  total,
  totalPaid,
  totalCharges,
  fmt,
  controls,
}: {
  ipdRows: {
    admissions: IpdAdm[];
    paidByIpd: Record<string, number>;
    chargesByIpd: Record<string, number>;
  };
  /** Range-wide totals from the API — `admissions` only holds the current page. */
  total: number;
  totalPaid: number;
  totalCharges: number;
  fmt: (n: number) => string;
  controls: ReportTableControls<IpdAdm>;
}) {
  const { formatDate } = useDateFormatter();
  const admissions = ipdRows?.admissions ?? [];
  const paidByIpd = ipdRows?.paidByIpd ?? {};
  const chargesByIpd = ipdRows?.chargesByIpd ?? {};

  const columns: ColumnDef<IpdAdm>[] = [
    {
      key: "ipdNumber",
      header: "IPD No",
      sortable: true,
      render: (r) => (
        <span className="font-mono text-2xs text-gray-500">
          {r.ipdNumber ?? "—"}
        </span>
      ),
      csvValue: (r) => String(r.ipdNumber ?? "—"),
    },
    {
      key: "admissionDate",
      header: "Admission Date",
      sortable: true,
      render: (r) => formatDate(r.admissionDate.split("T")[0]),
      csvValue: (r) => formatDate(r.admissionDate.split("T")[0]),
    },
    {
      key: "patient",
      header: "Patient",
      render: (r) => (
        <div>
          <div className="font-medium">{r.patientId?.name ?? "—"}</div>
          {r.patientId?.uhid && (
            <div className="text-gray-400 text-2xs">{r.patientId.uhid}</div>
          )}
          {r.patientId?.phone && (
            <div className="text-gray-400 text-2xs">{r.patientId.phone}</div>
          )}
        </div>
      ),
      csvValue: (r) =>
        r.patientId
          ? `${r.patientId.name}${r.patientId.uhid ? ` (${r.patientId.uhid})` : ""}`
          : "—",
    },
    {
      key: "doctor",
      header: "Doctor",
      render: (r) => (
        <div>
          <div>{r.doctorId?.name ?? "—"}</div>
          {r.doctorId?.specialization && (
            <div className="text-gray-400 text-2xs">
              {r.doctorId.specialization}
            </div>
          )}
        </div>
      ),
      csvValue: (r) => r.doctorId?.name ?? "—",
    },
    {
      key: "bed",
      header: "Bed",
      render: (r) => (
        <span className="text-gray-600">
          {r.bedGroup && r.bedNumber
            ? `${r.bedGroup} / ${r.bedNumber}`
            : (r.bedNumber ?? r.bedGroup ?? "—")}
        </span>
      ),
      csvValue: (r) =>
        r.bedGroup && r.bedNumber
          ? `${r.bedGroup} / ${r.bedNumber}`
          : (r.bedNumber ?? r.bedGroup ?? "—"),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (r) => {
        const isDischarge = r.status?.toUpperCase() === "DISCHARGED";
        return (
          <span
            className={`px-1.5 py-0.5 rounded text-2xs font-medium ${
              isDischarge
                ? "bg-success-100 text-success-700"
                : "bg-primary-100 text-primary-700"
            }`}
          >
            {isDischarge ? "Discharged" : "Admitted"}
          </span>
        );
      },
      csvValue: (r) =>
        r.status?.toUpperCase() === "DISCHARGED" ? "Discharged" : "Admitted",
    },
    {
      key: "dischargeDate",
      header: "Discharge Date",
      sortable: true,
      render: (r) =>
        r.dischargeDate ? formatDate(r.dischargeDate.split("T")[0]) : "—",
      csvValue: (r) =>
        r.dischargeDate ? formatDate(r.dischargeDate.split("T")[0]) : "—",
    },
    {
      key: "charges",
      header: "Total Charges",
      align: "right",
      render: (r) => {
        const charges = chargesByIpd[r._id] ?? 0;
        return charges > 0 ? fmt(charges) : "—";
      },
      csvValue: (r) => String(chargesByIpd[r._id] ?? 0),
    },
    {
      key: "paid",
      header: "Paid",
      align: "right",
      render: (r) => {
        const paid = paidByIpd[r._id] ?? 0;
        return (
          <span className="text-success-700">{paid > 0 ? fmt(paid) : "—"}</span>
        );
      },
      csvValue: (r) => String(paidByIpd[r._id] ?? 0),
    },
    {
      key: "balance",
      header: "Balance",
      align: "right",
      render: (r) => {
        const balance = (chargesByIpd[r._id] ?? 0) - (paidByIpd[r._id] ?? 0);
        return balance > 0 ? (
          <span className="text-danger-600">{fmt(balance)}</span>
        ) : balance < 0 ? (
          <span className="text-primary-600">{fmt(Math.abs(balance))} adv</span>
        ) : (
          <span className="text-success-600">Settled</span>
        );
      },
      csvValue: (r) =>
        String((chargesByIpd[r._id] ?? 0) - (paidByIpd[r._id] ?? 0)),
    },
  ];

  return (
    <ReportTable
      title="IPD Report"
      footer={`${total} admissions · Charges: ${fmt(totalCharges)} · Paid: ${fmt(totalPaid)} · Balance: ${fmt(totalCharges - totalPaid)}`}
      columns={columns}
      data={admissions}
      rowKey={(r) => r._id}
      total={total}
      controls={controls}
      itemLabel="admissions"
    />
  );
}
