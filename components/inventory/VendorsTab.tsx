"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Truck } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { useApp } from "@/lib/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const EMPTY = { name: "", contactPerson: "", phone: "", email: "", address: "", gstin: "" };

export function VendorsTab({ vendors, onRefresh }: Props) {
  const { can } = useApp();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryVendor | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY);

  function openAdd() { setEditing(null); setForm(EMPTY); setDialogOpen(true); }
  function openEdit(v: InventoryVendor) {
    setEditing(v);
    setForm({ name: v.name, contactPerson: v.contactPerson, phone: v.phone, email: v.email, address: v.address, gstin: v.gstin });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) return toast.error("Vendor name is required");
    setSaving(true);
    const res = editing
      ? await apiClient.put(`/api/dashboard/inventory/vendors/${editing._id}`, form)
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
    const res = await apiClient.delete(`/api/dashboard/inventory/vendors/${v._id}`);
    if (res.success) { toast.success("Deleted"); onRefresh(); }
    else toast.error(res.error ?? "Failed to delete");
  }

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

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Vendor Name</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Contact Person</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Phone</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Email</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600">GSTIN</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {vendors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    <Truck className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No vendors added yet
                  </td>
                </tr>
              ) : (
                vendors.map((v) => (
                  <tr key={v._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{v.name}</td>
                    <td className="px-4 py-3 text-gray-600">{v.contactPerson || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{v.phone || "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{v.email || "—"}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono">{v.gstin || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        {can("inventory", "edit") && (
                          <button onClick={() => openEdit(v)} className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {can("inventory", "delete") && (
                          <button onClick={() => handleDelete(v)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>{editing ? "Edit Vendor" : "Add Vendor"}</DialogTitle>
          <div className="space-y-3 py-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Vendor Name *</label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. ABC Medical Supplies" className="h-8 text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Contact Person</label>
                <Input value={form.contactPerson} onChange={(e) => setForm((f) => ({ ...f, contactPerson: e.target.value }))} placeholder="Name" className="h-8 text-xs" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+91 98765 43210" className="h-8 text-xs" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="vendor@example.com" className="h-8 text-xs" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">GSTIN</label>
                <Input value={form.gstin} onChange={(e) => setForm((f) => ({ ...f, gstin: e.target.value }))} placeholder="22AAAAA0000A1Z5" className="h-8 text-xs font-mono" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Address</label>
                <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="Full address" className="h-8 text-xs" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : editing ? "Update" : "Add Vendor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
