"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useApiQuery } from "@/lib/useApiQuery";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Pencil, Trash2 } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import type { MasterItem } from "@/lib/types/charges";

export function MasterDataSection({
  title,
  apiBase,
  onChanged,
}: {
  title: string;
  apiBase: string;
  onChanged?: () => void;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MasterItem | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const {
    data: itemsData,
    isPending: loading,
    refetch: load,
  } = useApiQuery<MasterItem[]>(["master-data", apiBase], apiBase);
  const items = itemsData ?? [];

  function openAdd() {
    setEditing(null);
    setName("");
    setDescription("");
    setFormOpen(true);
  }

  function openEdit(item: MasterItem) {
    setEditing(item);
    setName(item.name);
    setDescription(item.description ?? "");
    setFormOpen(true);
  }

  async function save() {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    const body = { name: name.trim(), description: description.trim() };
    const res = editing
      ? await apiClient.patch(`${apiBase}/${editing._id}`, body)
      : await apiClient.post(apiBase, body);
    if (res.success) {
      toast.success(editing ? `${title} updated` : `${title} added`);
      setFormOpen(false);
      load();
      onChanged?.();
    } else {
      toast.error(res.error);
    }
    setSaving(false);
  }

  async function toggleActive(item: MasterItem) {
    const res = await apiClient.patch(`${apiBase}/${item._id}`, {
      isActive: !item.isActive,
    });
    if (res.success) {
      load();
      onChanged?.();
    } else toast.error(res.error);
  }

  async function remove(id: string) {
    const res = await apiClient.delete(`${apiBase}/${id}`);
    if (res.success) {
      toast.success(`${title} deleted`);
      load();
      onChanged?.();
    } else toast.error(res.error);
  }

  const columns: ColumnDef<MasterItem>[] = [
    {
      key: "name",
      header: "Name",
      accessor: "name",
      sortable: true,
      render: (item) => (
        <span className="text-xs font-medium text-gray-800">{item.name}</span>
      ),
    },
    {
      key: "description",
      header: "Description",
      render: (item) => (
        <span className="text-xs text-gray-500 truncate block max-w-xs">
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
                  This {title.toLowerCase()} will be removed.
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
        emptyText={`No ${title.toLowerCase()}s configured yet`}
        toolbarRight={
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 bg-primary-600 hover:bg-primary-700"
            onClick={openAdd}
          >
            <Plus className="w-3.5 h-3.5" /> Add {title}
          </Button>
        }
        wrapperClassName="flex-1 overflow-auto"
        downloadable
        printable
        fileName={title}
      />

      <FormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? `Edit ${title}` : `Add ${title}`}
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
            <Label className="text-xs text-gray-500">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>
      </FormDialog>
    </>
  );
}
