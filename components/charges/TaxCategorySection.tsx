"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, X, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
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
import type { TaxCategoryItem } from "@/lib/types/charges";

const API_BASE = "/api/dashboard/tax-categories";

export function TaxCategorySection({ onChanged }: { onChanged?: () => void }) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<TaxCategoryItem[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TaxCategoryItem | null>(null);
  const [name, setName] = useState("");
  const [percent, setPercent] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await apiClient.get<TaxCategoryItem[]>(API_BASE);
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
    setPercent("");
    setDescription("");
    setFormOpen(true);
  }

  function openEdit(item: TaxCategoryItem) {
    setEditing(item);
    setName(item.name);
    setPercent(String(item.percent));
    setDescription(item.description ?? "");
    setFormOpen(true);
  }

  async function save() {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    const body = {
      name: name.trim(),
      percent: Number(percent) || 0,
      description: description.trim(),
    };
    const res = editing
      ? await apiClient.patch(`${API_BASE}/${editing._id}`, body)
      : await apiClient.post(API_BASE, body);
    if (res.success) {
      toast.success(editing ? "Tax category updated" : "Tax category added");
      setFormOpen(false);
      load();
      onChanged?.();
    } else {
      toast.error(res.error);
    }
    setSaving(false);
  }

  async function toggleActive(item: TaxCategoryItem) {
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
      toast.success("Tax category deleted");
      load();
      onChanged?.();
    } else toast.error(res.error);
  }

  const columns: ColumnDef<TaxCategoryItem>[] = [
    { key: "name", header: "Name", accessor: "name", sortable: true },
    {
      key: "percent",
      header: "Tax (%)",
      align: "right",
      sortable: true,
      sortValue: (item) => item.percent,
      render: (item) => item.percent.toFixed(2),
    },
    {
      key: "description",
      header: "Description",
      render: (item) => (
        <span className="text-gray-500 truncate block max-w-xs">
          {item.description || "—"}
        </span>
      ),
      csvValue: (item) => item.description ?? "",
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
          <button
            onClick={() => openEdit(item)}
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
                <AlertDialogTitle>Delete "{item.name}"?</AlertDialogTitle>
                <AlertDialogDescription>
                  This tax category will be removed.
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
        emptyText="No tax categories configured yet"
        toolbarRight={
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 bg-primary-600 hover:bg-primary-700"
            onClick={openAdd}
          >
            <Plus className="w-3.5 h-3.5" /> Add Tax Category
          </Button>
        }
        wrapperClassName="flex-1 overflow-auto"
        downloadable
        printable
        fileName="TaxCategory"
      />

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-none sm:w-[min(92vw,420px)] p-0 overflow-hidden gap-0"
        >
          <div className="bg-primary-600 text-white flex items-center justify-between px-5 py-3.5">
            <DialogTitle>
              {editing ? "Edit Tax Category" : "Add Tax Category"}
            </DialogTitle>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="text-white hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="px-5 py-4 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500">Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500">Tax (%)</Label>
              <Input
                type="number"
                min={0}
                value={percent}
                onChange={(e) => setPercent(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500">Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <div className="border-t px-5 py-3 flex justify-end gap-2">
            <Button
              className="bg-primary-600 hover:bg-primary-700"
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
