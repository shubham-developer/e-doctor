"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useApiQuery } from "@/lib/useApiQuery";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { CHARGE_MODULES } from "@/lib/constants/modules";
import type { ChargeTypeItem } from "@/lib/types/charges";

const API_BASE = "/api/dashboard/charge-types";

export function ChargeTypeSection({ onChanged }: { onChanged?: () => void }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ChargeTypeItem | null>(null);
  const [name, setName] = useState("");
  const [applicableModules, setApplicableModules] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const {
    data: itemsData,
    isPending: loading,
    refetch: load,
  } = useApiQuery<ChargeTypeItem[]>(["charge-types"], API_BASE);
  const items = itemsData ?? [];

  function openAdd() {
    setEditing(null);
    setName("");
    setApplicableModules([]);
    setFormOpen(true);
  }

  function openEdit(item: ChargeTypeItem) {
    setEditing(item);
    setName(item.name);
    setApplicableModules(item.applicableModules);
    setFormOpen(true);
  }

  function toggleFormModule(key: string) {
    setApplicableModules((prev) =>
      prev.includes(key) ? prev.filter((m) => m !== key) : [...prev, key],
    );
  }

  async function save() {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    const res = editing
      ? await apiClient.patch(`${API_BASE}/${editing._id}`, {
          name: name.trim(),
          applicableModules,
        })
      : await apiClient.post(API_BASE, {
          name: name.trim(),
          applicableModules,
        });
    if (res.success) {
      toast.success(editing ? "Charge type updated" : "Charge type added");
      setFormOpen(false);
      load();
      onChanged?.();
    } else {
      toast.error(res.error);
    }
    setSaving(false);
  }

  async function toggleModule(item: ChargeTypeItem, key: string) {
    const applicableModules = item.applicableModules.includes(key)
      ? item.applicableModules.filter((m) => m !== key)
      : [...item.applicableModules, key];
    const res = await apiClient.patch(`${API_BASE}/${item._id}`, {
      applicableModules,
    });
    if (!res.success) toast.error(res.error);
    load();
  }

  async function toggleActive(item: ChargeTypeItem) {
    const res = await apiClient.patch(`${API_BASE}/${item._id}`, {
      isActive: !item.isActive,
    });
    if (res.success) {
      onChanged?.();
    } else {
      toast.error(res.error);
    }
    load();
  }

  async function remove(id: string) {
    const res = await apiClient.delete(`${API_BASE}/${id}`);
    if (res.success) {
      toast.success("Charge type deleted");
      load();
      onChanged?.();
    } else toast.error(res.error);
  }

  const columns: ColumnDef<ChargeTypeItem>[] = [
    {
      key: "name",
      header: "Charge Type",
      accessor: "name",
      sortable: true,
      render: (item) => (
        <span className="text-xs font-medium text-gray-800">{item.name}</span>
      ),
    },
    ...CHARGE_MODULES.map((mod): ColumnDef<ChargeTypeItem> => ({
      key: mod.key,
      header: mod.label,
      align: "center",
      render: (item) => (
        <Checkbox
          checked={item.applicableModules.includes(mod.key)}
          onCheckedChange={() => toggleModule(item, mod.key)}
        />
      ),
      csvValue: (item) =>
        item.applicableModules.includes(mod.key) ? "Yes" : "No",
    })),
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
      header: "Action",
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
                <AlertDialogTitle>Delete "{item.name}"?</AlertDialogTitle>
                <AlertDialogDescription>
                  This charge type will be removed.
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
        emptyText="No charge types configured yet"
        toolbarRight={
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 bg-primary-600 hover:bg-primary-700"
            onClick={openAdd}
          >
            <Plus className="w-3.5 h-3.5" /> Add Charge Type
          </Button>
        }
        wrapperClassName="flex-1 overflow-auto"
        downloadable
        printable
        fileName="ChargeType"
      />

      <FormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit Charge Type" : "Add Charge Type"}
        contentClassName="sm:w-[min(92vw,420px)]"
        footer={
          <Button
            className="bg-primary-600 hover:bg-primary-700"
            onClick={save}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        }
      >
        <div className="px-5 py-4 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-500">Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-500">Applicable Modules</Label>
            <div className="grid grid-cols-2 gap-2">
              {CHARGE_MODULES.map((mod) => (
                <label
                  key={mod.key}
                  className="flex items-center gap-2 text-sm text-gray-700"
                >
                  <Checkbox
                    checked={applicableModules.includes(mod.key)}
                    onCheckedChange={() => toggleFormModule(mod.key)}
                  />
                  {mod.label}
                </label>
              ))}
            </div>
          </div>
        </div>
      </FormDialog>
    </>
  );
}
