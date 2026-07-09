"use client";

import { useDateFormatter } from "@/lib/context";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import type { OpdPrescription } from "./types";

interface MedicationRow {
  id: string;
  date: string;
  category?: string;
  name: string;
  dose?: string;
  doseInterval?: string;
  doseDuration?: string;
  instruction?: string;
}

interface FindingRow {
  id: string;
  category?: string;
  description?: string;
}

export function OpdMedicationTab({
  prescriptions,
  currentVisitId,
}: {
  prescriptions: OpdPrescription[];
  currentVisitId: string;
}) {
  const { formatDate } = useDateFormatter();

  // One row per medicine across all of the patient's prescriptions (newest first).
  const rows: MedicationRow[] = prescriptions.flatMap((p) =>
    p.medicines.map((m, i) => ({
      id: `${p._id}-${i}`,
      ...m,
      date: p.createdAt,
    })),
  );

  const current = prescriptions.find((p) => p.opdVisitId === currentVisitId);
  const findingRows: FindingRow[] =
    current?.findings.map((f, i) => ({ id: String(i), ...f })) ?? [];

  const medicationColumns: ColumnDef<MedicationRow>[] = [
    {
      key: "date",
      header: "Date",
      sortable: true,
      sortValue: (m) => new Date(m.date),
      width: "w-28",
      render: (m) => (
        <span className="text-xs text-gray-700 whitespace-nowrap">
          {formatDate(m.date)}
        </span>
      ),
      csvValue: (m) => formatDate(m.date),
    },
    {
      key: "category",
      header: "Category",
      accessor: "category",
      render: (m) => (
        <span className="text-xs text-gray-700">{m.category || "—"}</span>
      ),
      csvValue: (m) => m.category ?? "",
    },
    {
      key: "name",
      header: "Medicine",
      accessor: "name",
      sortable: true,
      render: (m) => (
        <span className="text-xs font-medium text-gray-900">{m.name}</span>
      ),
    },
    {
      key: "dose",
      header: "Dose",
      accessor: "dose",
      render: (m) => <span className="text-xs text-gray-700">{m.dose || "—"}</span>,
      csvValue: (m) => m.dose ?? "",
    },
    {
      key: "doseInterval",
      header: "Dose Interval",
      accessor: "doseInterval",
      render: (m) => (
        <span className="text-xs text-gray-700">{m.doseInterval || "—"}</span>
      ),
      csvValue: (m) => m.doseInterval ?? "",
    },
    {
      key: "doseDuration",
      header: "Dose Duration",
      accessor: "doseDuration",
      render: (m) => (
        <span className="text-xs text-gray-700">{m.doseDuration || "—"}</span>
      ),
      csvValue: (m) => m.doseDuration ?? "",
    },
    {
      key: "instruction",
      header: "Instruction",
      accessor: "instruction",
      render: (m) => (
        <span className="text-xs text-gray-700">{m.instruction || "—"}</span>
      ),
      csvValue: (m) => m.instruction ?? "",
    },
  ];

  const findingColumns: ColumnDef<FindingRow>[] = [
    {
      key: "category",
      header: "Category",
      accessor: "category",
      render: (f) => (
        <span className="text-xs text-gray-700">{f.category || "—"}</span>
      ),
      csvValue: (f) => f.category ?? "",
    },
    {
      key: "description",
      header: "Description",
      accessor: "description",
      render: (f) => (
        <span className="text-xs text-gray-700">{f.description || "—"}</span>
      ),
      csvValue: (f) => f.description ?? "",
    },
  ];

  if (rows.length === 0) {
    return (
      <div className="p-4">
        <div className="border border-gray-200 rounded-lg bg-white p-6 text-center text-xs text-gray-400">
          No medication recorded for this patient.
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-sm font-semibold text-gray-800">Medication</h2>
      <DataTable
        columns={medicationColumns}
        data={rows}
        rowKey={(m) => m.id}
        wrapperClassName="rounded-lg"
        downloadable
        printable
        fileName="OPD Medication"
      />

      {findingRows.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-gray-800">
            Findings (this visit)
          </h2>
          <DataTable
            columns={findingColumns}
            data={findingRows}
            rowKey={(f) => f.id}
            wrapperClassName="rounded-lg"
          />
        </>
      )}
    </div>
  );
}
