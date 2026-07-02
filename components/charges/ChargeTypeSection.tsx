"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, X, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ChargeTypeItem[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ChargeTypeItem | null>(null);
  const [name, setName] = useState("");
  const [applicableModules, setApplicableModules] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await apiClient.get<ChargeTypeItem[]>(API_BASE);
    if (res.success) setItems(res.data);
    else toast.error(res.error);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

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
    setItems((prev) =>
      prev.map((i) => (i._id === item._id ? { ...i, applicableModules } : i)),
    );
    const res = await apiClient.patch(`${API_BASE}/${item._id}`, {
      applicableModules,
    });
    if (!res.success) {
      toast.error(res.error);
      setItems((prev) => prev.map((i) => (i._id === item._id ? item : i)));
    }
  }

  async function toggleActive(item: ChargeTypeItem) {
    setItems((prev) =>
      prev.map((i) =>
        i._id === item._id ? { ...i, isActive: !i.isActive } : i,
      ),
    );
    const res = await apiClient.patch(`${API_BASE}/${item._id}`, {
      isActive: !item.isActive,
    });
    if (res.success) {
      onChanged?.();
    } else {
      toast.error(res.error);
      setItems((prev) => prev.map((i) => (i._id === item._id ? item : i)));
    }
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
    { key: "name", header: "Charge Type", accessor: "name", sortable: true },
    ...CHARGE_MODULES.map(
      (mod): ColumnDef<ChargeTypeItem> => ({
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
      }),
    ),
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
          <button
            onClick={() => openEdit(item)}
            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <button className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" />
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
                  className="bg-red-600 hover:bg-red-700"
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
            className="h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700"
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

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-none sm:w-[min(92vw,420px)] p-0 overflow-hidden gap-0"
        >
          <div className="bg-blue-600 text-white flex items-center justify-between px-5 py-3.5">
            <h2 className="text-base font-semibold">
              {editing ? "Edit Charge Type" : "Add Charge Type"}
            </h2>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="text-white hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
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
              <Label className="text-xs text-gray-500">
                Applicable Modules
              </Label>
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
          <div className="border-t px-5 py-3 flex justify-end gap-2">
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={save}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
