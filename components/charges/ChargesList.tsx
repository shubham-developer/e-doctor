"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCharges } from "@/lib/lookups";
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
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Charge | null>(null);
  const queryClient = useQueryClient();

  // Same cache the dropdown pickers read from (useCharges())
  const { data: chargesData, isPending: loading } = useCharges();
  const charges = useMemo(() => chargesData ?? [], [chargesData]);

  function load() {
    queryClient.invalidateQueries({ queryKey: ["charges"] });
  }

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
    if (res.success) {
      queryClient.invalidateQueries({ queryKey: ["charges"] });
      load();
    } else toast.error(res.error);
  }

  async function remove(id: string) {
    const res = await apiClient.delete(`/api/dashboard/charges/${id}`);
    if (res.success) {
      queryClient.invalidateQueries({ queryKey: ["charges"] });
      toast.success("Service deleted");
      load();
    } else toast.error(res.error);
  }

  const columns: ColumnDef<Charge>[] = [
    {
      key: "name",
      header: "Service Name",
      accessor: "name",
      sortable: true,
      render: (c) => (
        <span className="text-xs font-medium text-gray-800">{c.name}</span>
      ),
    },
    {
      key: "chargeCategoryName",
      header: "Category",
      render: (c) => (
        <span className="text-xs text-gray-600">
          {c.chargeCategoryName ?? "—"}
        </span>
      ),
      csvValue: (c) => c.chargeCategoryName ?? "",
    },
    {
      key: "standardCharge",
      header: "Price",
      align: "right",
      sortable: true,
      sortValue: (c) => c.standardCharge,
      render: (c) => (
        <span className="text-xs font-medium text-gray-800">
          {fmt(c.standardCharge)}
        </span>
      ),
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
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => openEdit(c)}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-gray-400 hover:text-danger-500 hover:bg-danger-50"
                />
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
