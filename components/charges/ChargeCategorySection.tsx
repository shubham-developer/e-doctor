"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useApiQuery } from "@/lib/useApiQuery";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FormDialog } from "@/components/common/FormDialog";
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
import type { ChargeCategoryItem, MasterItem } from "@/lib/types/charges";

const API_BASE = "/api/dashboard/charge-categories";

const ALL_MODULES = [
  { key: "opd", label: "OPD" },
  { key: "ipd", label: "IPD" },
  { key: "pharmacy", label: "Pharmacy" },
  { key: "pathology", label: "Pathology" },
  { key: "radiology", label: "Radiology" },
];

const MODULE_COLORS: Record<string, string> = {
  opd: "bg-blue-100 text-blue-700",
  ipd: "bg-purple-100 text-purple-700",
  pharmacy: "bg-green-100 text-green-700",
  pathology: "bg-amber-100 text-amber-700",
  radiology: "bg-rose-100 text-rose-700",
};

export function ChargeCategorySection({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  types: _types,
  onChanged,
}: {
  types: MasterItem[];
  onChanged?: () => void;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ChargeCategoryItem | null>(null);
  const [name, setName] = useState("");
  const [appliesTo, setAppliesTo] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const {
    data: itemsData,
    isPending: loading,
    refetch: load,
  } = useApiQuery<ChargeCategoryItem[]>(["charge-categories"], API_BASE);
  const items = itemsData ?? [];

  function openAdd() {
    setEditing(null);
    setName("");
    setAppliesTo([]);
    setFormOpen(true);
  }

  function openEdit(item: ChargeCategoryItem) {
    setEditing(item);
    setName(item.name);
    setAppliesTo(item.appliesTo ?? []);
    setFormOpen(true);
  }

  function toggleModule(key: string) {
    setAppliesTo((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  async function save() {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (appliesTo.length === 0) {
      toast.error("Select at least one module");
      return;
    }
    setSaving(true);
    const body = { name: name.trim(), appliesTo };
    const res = editing
      ? await apiClient.patch(`${API_BASE}/${editing._id}`, body)
      : await apiClient.post(API_BASE, body);
    if (res.success) {
      toast.success(editing ? "Category updated" : "Category added");
      setFormOpen(false);
      load();
      onChanged?.();
    } else {
      toast.error(res.error);
    }
    setSaving(false);
  }

  async function toggleActive(item: ChargeCategoryItem) {
    const res = await apiClient.patch(`${API_BASE}/${item._id}`, {
      isActive: !item.isActive,
    });
    if (res.success) {
      load();
      onChanged?.();
    } else toast.error(res.error);
  }

  async function remove(id: string) {
    const res = await apiClient.delete(`${API_BASE}/${id}`);
    if (res.success) {
      toast.success("Category deleted");
      load();
      onChanged?.();
    } else toast.error(res.error);
  }

  const columns: ColumnDef<ChargeCategoryItem>[] = [
    {
      key: "name",
      header: "Category Name",
      accessor: "name",
      sortable: true,
      render: (item) => (
        <span className="text-xs font-medium text-gray-800">{item.name}</span>
      ),
    },
    {
      key: "appliesTo",
      header: "Applies To",
      render: (item) => (
        <div className="flex flex-wrap gap-1">
          {item.appliesTo?.length ? (
            item.appliesTo.map((k) => (
              <span
                key={k}
                className={`px-2 py-0.5 text-2xs font-medium rounded-full ${MODULE_COLORS[k] ?? "bg-gray-100 text-gray-600"}`}
              >
                {ALL_MODULES.find((m) => m.key === k)?.label ?? k}
              </span>
            ))
          ) : (
            <span className="text-gray-400 text-xs">—</span>
          )}
        </div>
      ),
      csvValue: (item) => (item.appliesTo ?? []).join(", "),
    },
    {
      key: "active",
      header: "Active",
      width: "w-24",
      render: (item) => (
        <Switch
          checked={item.isActive}
          onCheckedChange={() => toggleActive(item)}
        />
      ),
    },
    {
      key: "actions",
      header: "",
      width: "w-20",
      align: "right",
      render: (item) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => openEdit(item)}
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
                  Delete &ldquo;{item.name}&rdquo;?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This service category will be removed.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-danger-600 hover:bg-danger-700"
                  onClick={() => remove(item._id)}
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
        data={items}
        rowKey={(item) => item._id}
        loading={loading}
        emptyText="No service categories yet"
        toolbarRight={
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 bg-primary-600 hover:bg-primary-700"
            onClick={openAdd}
          >
            <Plus className="w-3.5 h-3.5" /> Add Category
          </Button>
        }
        wrapperClassName="flex-1 overflow-auto"
        downloadable
        printable
        fileName="ServiceCategories"
      />

      <FormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit Service Category" : "Add Service Category"}
        contentClassName="sm:w-[min(92vw,460px)]"
        footer={
          <>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-primary-600 hover:bg-primary-700"
              onClick={save}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </>
        }
      >
        <div className="px-5 py-4 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-500">Category Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              placeholder="e.g. Consultation, Bed Charges"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-gray-500">Applies To *</Label>
            <div className="flex flex-wrap gap-2">
              {ALL_MODULES.map((m) => {
                const checked = appliesTo.includes(m.key);
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => toggleModule(m.key)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                      checked
                        ? "bg-primary-600 text-white border-primary-600"
                        : "bg-white text-gray-600 border-gray-300 hover:border-primary-400"
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
            <p className="text-2xs text-gray-400">
              Services in this category will auto-populate in selected module
              billing forms.
            </p>
          </div>
        </div>
      </FormDialog>
    </>
  );
}
