"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { apiClient } from "@/lib/apiClient";
import { useCurrency } from "@/lib/context";
import type { Charge, MasterItem, TaxCategoryItem } from "@/lib/types/charges";

export function ChargeFormModal({
  open,
  charge,
  categories,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  units: _units,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  taxCategories: _taxCategories,
  onClose,
  onSaved,
}: {
  open: boolean;
  charge: Charge | null;
  categories: MasterItem[];
  units: MasterItem[];
  taxCategories: TaxCategoryItem[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { sym } = useCurrency();
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [standardCharge, setStandardCharge] = useState("");
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!open) return;
    setName(charge?.name ?? "");
    setCategoryId(charge?.chargeCategoryId ?? "");
    setStandardCharge(charge ? String(charge.standardCharge) : "");
  }, [open, charge]);

  async function save() {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    const body = {
      name: name.trim(),
      chargeCategoryId: categoryId || null,
      standardCharge: Number(standardCharge) || 0,
    };
    const res = charge
      ? await apiClient.patch(`/api/dashboard/charges/${charge._id}`, body)
      : await apiClient.post("/api/dashboard/charges", body);
    if (res.success) {
      queryClient.invalidateQueries({ queryKey: ["charges"] });
      toast.success(charge ? "Service updated" : "Service added");
      onSaved();
      onClose();
    } else {
      toast.error(res.error);
    }
    setSaving(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-none sm:w-[min(92vw,460px)] p-0 overflow-hidden gap-0"
      >
        <div className="bg-primary-600 text-white flex items-center justify-between px-5 py-3.5">
          <DialogTitle>{charge ? "Edit Service" : "Add Service"}</DialogTitle>
          <button
            type="button"
            onClick={onClose}
            className="text-white hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-500">Service Category</Label>
            <SearchableSelect
              value={categoryId}
              onValueChange={setCategoryId}
              options={categories.map((c) => ({
                value: c._id,
                label: c.name,
              }))}
              placeholder="Select category"
              triggerClassName="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-500">Service Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              placeholder="e.g. General Consultation, X-Ray Chest PA"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-500">Price ({sym})</Label>
            <Input
              type="number"
              min={0}
              value={standardCharge}
              onChange={(e) => setStandardCharge(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="border-t px-5 py-3 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
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
  );
}
