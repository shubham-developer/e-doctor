"use client";

import { useState } from "react";
import { useCurrency } from "@/lib/context";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, IndianRupee, BedDouble } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { useApiQuery } from "@/lib/useApiQuery";
import { AddChargeDialog } from "@/components/ipd/AddChargeDialog";
import type { IpdDetail, IpdCharge } from "@/components/ipd/types";

export function ChargesTab({
  ipdId,
  admission: _admission,
}: {
  ipdId: string;
  admission: IpdDetail;
}) {
  const { fmt } = useCurrency();

  const { data: chargesData, refetch: loadCharges } = useApiQuery<IpdCharge[]>(
    ["ipd-charges", ipdId],
    `/api/dashboard/ipd/${ipdId}/charges`,
  );
  const charges = chargesData ?? [];

  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<IpdCharge | null>(null);

  function startEdit(c: IpdCharge) {
    setEditItem(c);
    setShowForm(true);
  }

  async function deleteCharge(id: string) {
    const d = await apiClient.delete(
      `/api/dashboard/ipd/${ipdId}/charges/${id}`,
    );
    if (d.success) loadCharges();
    else toast.error("Failed to delete");
  }

  const total = charges.reduce((s, c) => s + c.total, 0);

  const columns: ColumnDef<IpdCharge>[] = [
    {
      key: "date",
      header: "Date",
      accessor: "date",
      sortable: true,
      width: "w-28",
      render: (c) => (
        <span className="text-xs text-gray-500">{c.date || "—"}</span>
      ),
    },
    {
      key: "categoryName",
      header: "Service",
      accessor: "categoryName",
      sortable: true,
      render: (c) => (
        <div>
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-medium text-gray-800">
              {c.categoryName}
            </p>
            {c.isBedCharge && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-2xs font-semibold bg-blue-50 text-blue-600 border border-blue-200">
                <BedDouble className="w-2.5 h-2.5" /> Bed
              </span>
            )}
          </div>
          {c.note && <p className="text-xs text-gray-400">{c.note}</p>}
        </div>
      ),
      csvValue: (c) => c.categoryName,
    },
    {
      key: "quantity",
      header: "Qty",
      accessor: "quantity",
      sortable: true,
      align: "right",
      width: "w-16",
      render: (c) => (
        <span className="text-xs text-gray-700">{c.quantity}</span>
      ),
    },
    {
      key: "unitPrice",
      header: "Unit Price",
      align: "right",
      sortable: true,
      sortValue: (c) => c.unitPrice,
      render: (c) => (
        <span className="text-xs text-gray-700">{fmt(c.unitPrice)}</span>
      ),
      csvValue: (c) => String(c.unitPrice),
    },
    {
      key: "total",
      header: "Total",
      align: "right",
      sortable: true,
      sortValue: (c) => c.total,
      render: (c) => (
        <span className="text-xs font-semibold text-gray-900">
          {fmt(c.total)}
        </span>
      ),
      csvValue: (c) => String(c.total),
    },
    {
      key: "actions",
      header: "",
      width: "w-16",
      align: "right",
      render: (c) =>
        !c.isBedCharge && (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => startEdit(c)}
              className="text-gray-400 hover:text-primary-600 hover:bg-gray-100"
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => deleteCharge(c._id)}
              className="text-gray-400 hover:text-danger-500 hover:bg-danger-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        ),
    },
  ];

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IndianRupee className="w-4 h-4 text-primary-600" />
          <span className="text-sm font-semibold text-gray-800">
            Total Charges:
          </span>
          <span className="text-sm font-bold text-primary-700">
            {fmt(total)}
          </span>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditItem(null);
            setShowForm(true);
          }}
        >
          <Plus className="w-3.5 h-3.5" /> Add Charge
        </Button>
      </div>

      {/* Charges table */}
      <DataTable
        columns={columns}
        data={charges}
        rowKey={(c) => c._id}
        emptyNode={
          <div className="flex flex-col items-center justify-center gap-2">
            <IndianRupee className="w-10 h-10 opacity-20" />
            <p className="text-sm">No charges added yet</p>
            <p className="text-xs">
              Click &quot;Add Charge&quot; to add a billable item
            </p>
          </div>
        }
        wrapperClassName="rounded-lg"
        downloadable
        printable
        fileName="IPD Charges"
      />

      <AddChargeDialog
        ipdId={ipdId}
        open={showForm}
        editItem={editItem}
        onClose={() => setShowForm(false)}
        onSaved={loadCharges}
      />
    </div>
  );
}
