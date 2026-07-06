"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Truck } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { useApp } from "@/lib/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { InventoryVendor } from "./types";

interface Props {
  vendors: InventoryVendor[];
  onRefresh: () => void;
}

const EMPTY = {
  name: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  gstin: "",
};

export function VendorsTab({ vendors, onRefresh }: Props) {
  const { can } = useApp();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryVendor | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY);

  function openAdd() {
    setEditing(null);
    setForm(EMPTY);
    setDialogOpen(true);
  }
  function openEdit(v: InventoryVendor) {
    setEditing(v);
    setForm({
      name: v.name,
      contactPerson: v.contactPerson,
      phone: v.phone,
      email: v.email,
      address: v.address,
      gstin: v.gstin,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) return toast.error("Vendor name is required");
    setSaving(true);
    const res = editing
      ? await apiClient.put(
          `/api/dashboard/inventory/vendors/${editing._id}`,
          form,
        )
      : await apiClient.post("/api/dashboard/inventory/vendors", form);
    setSaving(false);
    if (res.success) {
      toast.success(editing ? "Vendor updated" : "Vendor added");
      setDialogOpen(false);
      onRefresh();
    } else {
      toast.error(res.error ?? "Failed to save");
    }
  }

  async function handleDelete(v: InventoryVendor) {
    if (!confirm(`Delete vendor "${v.name}"?`)) return;
    const res = await apiClient.delete(
      `/api/dashboard/inventory/vendors/${v._id}`,
    );
    if (res.success) {
      toast.success("Deleted");
      onRefresh();
    } else toast.error(res.error ?? "Failed to delete");
  }

  const columns: ColumnDef<InventoryVendor>[] = [
    {
      key: "name",
      header: "Vendor Name",
      render: (v) => (
        <span className="font-medium text-gray-800">{v.name}</span>
      ),
    },
    {
      key: "contactPerson",
      header: "Contact Person",
      render: (v) => (
        <span className="text-gray-600">{v.contactPerson || "—"}</span>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      render: (v) => <span className="text-gray-600">{v.phone || "—"}</span>,
    },
    {
      key: "email",
      header: "Email",
      render: (v) => <span className="text-gray-500">{v.email || "—"}</span>,
    },
    {
      key: "gstin",
      header: "GSTIN",
      render: (v) => (
        <span className="text-gray-500 font-mono">{v.gstin || "—"}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (v) => (
        <div className="flex items-center gap-1">
          {can("inventory", "edit") && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => openEdit(v)}
              className="text-gray-400 hover:text-blue-600 hover:bg-blue-50"
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          )}
          {can("inventory", "delete") && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => handleDelete(v)}
              className="text-gray-400 hover:text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">{vendors.length} vendors</p>
        {can("inventory", "add") && (
          <Button size="sm" className="h-8 text-xs gap-1.5" onClick={openAdd}>
            <Plus className="w-3.5 h-3.5" />
            Add Vendor
          </Button>
        )}
      </div>

      <DataTable<InventoryVendor>
        columns={columns}
        data={vendors}
        rowKey={(v) => v._id}
        emptyNode={
          <div>
            <Truck className="w-8 h-8 mx-auto mb-2 opacity-30" />
            No vendors added yet
          </div>
        }
        wrapperClassName="rounded-xl"
        className="text-xs"
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>{editing ? "Edit Vendor" : "Add Vendor"}</DialogTitle>
          <div className="space-y-3 py-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Vendor Name *
              </label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="e.g. ABC Medical Supplies"
                className="h-8 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Contact Person
                </label>
                <Input
                  value={form.contactPerson}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, contactPerson: e.target.value }))
                  }
                  placeholder="Name"
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <Input
                  value={form.phone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, phone: e.target.value }))
                  }
                  placeholder="+91 98765 43210"
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Email
                </label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                  placeholder="vendor@example.com"
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  GSTIN
                </label>
                <Input
                  value={form.gstin}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, gstin: e.target.value }))
                  }
                  placeholder="22AAAAA0000A1Z5"
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Address
                </label>
                <Input
                  value={form.address}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, address: e.target.value }))
                  }
                  placeholder="Full address"
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : editing ? "Update" : "Add Vendor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
