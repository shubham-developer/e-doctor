"use client";

import { useState } from "react";
import { useCurrency } from "@/lib/context";
import { apiClient } from "@/lib/apiClient";
import { useApiQuery } from "@/lib/useApiQuery";
import { Plus, Trash2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { AddMedicineDialog } from "@/components/ipd/AddMedicineDialog";
import type { IpdMedication } from "@/components/ipd/types";

export function MedicationTab({ ipdId }: { ipdId: string }) {
  const { fmt } = useCurrency();
  const [showForm, setShowForm] = useState(false);

  const { data: medicationsData, refetch: loadMedications } = useApiQuery<
    IpdMedication[]
  >(["ipd-medications", ipdId], `/api/dashboard/ipd/${ipdId}/medications`);
  const medications = medicationsData ?? [];

  async function deleteMedication(id: string) {
    await apiClient.delete(`/api/dashboard/ipd/${ipdId}/medications/${id}`);
    loadMedications();
  }

  const total = medications.reduce((s, m) => s + m.total, 0);

  const columns: ColumnDef<IpdMedication>[] = [
    {
      key: "date",
      header: "Date",
      accessor: "date",
      sortable: true,
      width: "w-28",
      render: (m) => <span className="text-xs text-gray-500">{m.date}</span>,
    },
    {
      key: "medicineName",
      header: "Medicine",
      accessor: "medicineName",
      sortable: true,
      render: (m) => (
        <div>
          <p className="text-xs font-medium text-gray-800">
            {m.medicineName}
          </p>
          {m.note && <p className="text-xs text-gray-400">{m.note}</p>}
        </div>
      ),
      csvValue: (m) => m.medicineName,
    },
    {
      key: "quantity",
      header: "Qty",
      accessor: "quantity",
      sortable: true,
      align: "right",
      width: "w-16",
      render: (m) => <span className="text-xs text-gray-700">{m.quantity}</span>,
    },
    {
      key: "unitPrice",
      header: "Unit Price",
      align: "right",
      sortable: true,
      sortValue: (m) => m.unitPrice,
      render: (m) => (
        <span className="text-xs text-gray-700">{fmt(m.unitPrice)}</span>
      ),
      csvValue: (m) => String(m.unitPrice),
    },
    {
      key: "total",
      header: "Total",
      align: "right",
      sortable: true,
      sortValue: (m) => m.total,
      render: (m) => (
        <span className="text-xs font-semibold text-gray-900">
          {fmt(m.total)}
        </span>
      ),
      csvValue: (m) => String(m.total),
    },
    {
      key: "addedByName",
      header: "By",
      accessor: "addedByName",
      width: "w-28",
      render: (m) => (
        <span className="text-xs text-gray-500">{m.addedByName || "—"}</span>
      ),
      csvValue: (m) => m.addedByName ?? "",
    },
    {
      key: "actions",
      header: "",
      width: "w-12",
      align: "right",
      render: (m) => (
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => deleteMedication(m._id)}
          className="text-gray-400 hover:text-danger-500 hover:bg-danger-50"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      ),
    },
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-800">
            Total Medication:
          </span>
          <span className="text-sm font-bold text-primary-700">{fmt(total)}</span>
          <span className="text-xs text-gray-400">
            (added to Charges automatically)
          </span>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="w-3.5 h-3.5" /> Add Medicine
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={medications}
        rowKey={(m) => m._id}
        emptyNode={
          <div className="flex flex-col items-center justify-center gap-2">
            <FileText className="w-10 h-10 opacity-20" />
            <p className="text-sm">No medications added yet</p>
            <p className="text-xs">
              Added medicines are automatically billed in Charges
            </p>
          </div>
        }
        wrapperClassName="rounded-lg"
        downloadable
        printable
        fileName="IPD Medications"
      />

      <AddMedicineDialog
        ipdId={ipdId}
        open={showForm}
        onClose={() => setShowForm(false)}
        onSaved={loadMedications}
      />
    </div>
  );
}
