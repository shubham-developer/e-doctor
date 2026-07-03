"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { apiClient } from "@/lib/apiClient";
import { useCurrency } from "@/lib/context";
import { ChargeFormModal } from "./ChargeFormModal";
import type { Charge, MasterItem, TaxCategoryItem } from "@/lib/types/charges";

export function ChargesList({
  categories,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  units: _units,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  taxCategories: _taxCategories,
  onMasterDataChanged,
}: {
  categories: MasterItem[];
  units: MasterItem[];
  taxCategories: TaxCategoryItem[];
  onMasterDataChanged: () => void;
}) {
  const { fmt } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [charges, setCharges] = useState<Charge[]>([]);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Charge | null>(null);

  async function load() {
    setLoading(true);
    const res = await apiClient.get<Charge[]>("/api/dashboard/charges");
    if (res.success) setCharges(res.data);
    else toast.error(res.error);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return charges;
    return charges.filter((c) => c.name.toLowerCase().includes(q));
  }, [charges, search]);

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(charge: Charge) {
    setEditing(charge);
    setFormOpen(true);
  }

  function handleSaved() {
    load();
    onMasterDataChanged();
  }

  async function toggleActive(charge: Charge) {
    const res = await apiClient.patch(`/api/dashboard/charges/${charge._id}`, {
      isActive: !charge.isActive,
    });
    if (res.success) load();
    else toast.error(res.error);
  }

  async function remove(id: string) {
    const res = await apiClient.delete(`/api/dashboard/charges/${id}`);
    if (res.success) {
      toast.success("Service deleted");
      load();
    } else toast.error(res.error);
  }

  const columns: ColumnDef<Charge>[] = [
    { key: "name", header: "Service Name", accessor: "name", sortable: true },
    {
      key: "chargeCategoryName",
      header: "Category",
      render: (c) => c.chargeCategoryName ?? "—",
      csvValue: (c) => c.chargeCategoryName ?? "",
    },
    {
      key: "standardCharge",
      header: "Price",
      align: "right",
      sortable: true,
      sortValue: (c) => c.standardCharge,
      render: (c) => fmt(c.standardCharge),
      csvValue: (c) => String(c.standardCharge),
    },
    {
      key: "active",
      header: "Active",
      width: "w-24",
      render: (c) => (
        <Switch checked={c.isActive} onCheckedChange={() => toggleActive(c)} />
      ),
    },
    {
      key: "actions",
      header: "",
      width: "w-20",
      align: "right",
      render: (c) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => openEdit(c)}
            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <button className="p-1.5 rounded-md hover:bg-danger-50 text-gray-400 hover:text-danger-500 transition-colors" />
              }
            >
              <Trash2 className="w-3.5 h-3.5" />
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Delete &ldquo;{c.name}&rdquo;?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This service will be removed. Existing bills won&apos;t be
                  affected.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-danger-600 hover:bg-danger-700"
                  onClick={() => remove(c._id)}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(c) => c._id}
        loading={loading}
        emptyText="No services configured yet"
        searchValue={search}
        onSearchChange={setSearch}
        toolbarRight={
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 bg-primary-600 hover:bg-primary-700"
            onClick={openAdd}
          >
            <Plus className="w-3.5 h-3.5" /> Add Service
          </Button>
        }
        wrapperClassName="flex-1 overflow-auto"
        downloadable
        printable
        fileName="Services"
      />

      <ChargeFormModal
        open={formOpen}
        charge={editing}
        categories={categories}
        units={[]}
        taxCategories={[]}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
      />
    </>
  );
}
