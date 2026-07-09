"use client";

import { useCurrency, useDateFormatter } from "@/lib/context";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import type { OpdPatientHistory, OpdPrescription } from "./types";

interface LabRow {
  id: string;
  testName: string;
  lab: string;
  billNo: string;
  reportDate?: string;
  amount?: number;
}

export function OpdLabInvestigationTab({
  history,
  prescription,
}: {
  history: OpdPatientHistory | null;
  prescription: OpdPrescription | null;
}) {
  const { fmt } = useCurrency();
  const { formatDate } = useDateFormatter();

  const rows: LabRow[] = [
    ...(history?.pathology ?? []).flatMap((b) =>
      b.items.map((it, i) => ({
        id: `pathology-${b._id}-${i}`,
        ...it,
        lab: "Pathology",
        billNo: b.billNo,
      })),
    ),
    ...(history?.radiology ?? []).flatMap((b) =>
      b.items.map((it, i) => ({
        id: `radiology-${b._id}-${i}`,
        ...it,
        lab: "Radiology",
        billNo: b.billNo,
      })),
    ),
  ];

  const suggested = [
    prescription?.pathology ? `Pathology: ${prescription.pathology}` : null,
    prescription?.radiology ? `Radiology: ${prescription.radiology}` : null,
  ].filter(Boolean);

  const columns: ColumnDef<LabRow>[] = [
    {
      key: "testName",
      header: "Test Name",
      accessor: "testName",
      sortable: true,
      render: (r) => (
        <span className="text-xs font-medium text-gray-900">
          {r.testName}
        </span>
      ),
    },
    {
      key: "lab",
      header: "Lab",
      accessor: "lab",
      sortable: true,
      render: (r) => <span className="text-xs text-gray-700">{r.lab}</span>,
    },
    {
      key: "billNo",
      header: "Bill No",
      accessor: "billNo",
      render: (r) => <span className="text-xs text-gray-700">{r.billNo}</span>,
    },
    {
      key: "reportDate",
      header: "Report Date",
      sortable: true,
      sortValue: (r) => (r.reportDate ? new Date(r.reportDate) : new Date(0)),
      render: (r) => (
        <span className="text-xs text-gray-700 whitespace-nowrap">
          {r.reportDate ? formatDate(r.reportDate) : "—"}
        </span>
      ),
      csvValue: (r) => (r.reportDate ? formatDate(r.reportDate) : ""),
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      sortable: true,
      sortValue: (r) => r.amount ?? 0,
      render: (r) => (
        <span className="text-xs text-gray-700">
          {r.amount != null ? fmt(r.amount) : "—"}
        </span>
      ),
      csvValue: (r) => (r.amount != null ? String(r.amount) : ""),
    },
  ];

  return (
    <div className="p-4 space-y-4">
      {suggested.length > 0 && (
        <div className="border border-primary-100 bg-primary-50/50 rounded-lg p-3">
          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
            Suggested in Prescription
          </h3>
          {suggested.map((s, i) => (
            <p key={i} className="text-xs text-gray-700">
              {s}
            </p>
          ))}
        </div>
      )}

      <DataTable
        columns={columns}
        data={rows}
        rowKey={(r) => r.id}
        emptyText="No lab tests found for this patient."
        wrapperClassName="rounded-lg"
        downloadable
        printable
        fileName="OPD Lab Investigations"
      />
    </div>
  );
}
