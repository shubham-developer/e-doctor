"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { apiClient } from "@/lib/apiClient";
import type { Charge, MasterItem, TaxCategoryItem } from "@/lib/types/charges";

export function ChargeFormModal({
  open,
  charge,
  categories,
  units,
  taxCategories,
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
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [taxCategoryId, setTaxCategoryId] = useState("");
  const [standardCharge, setStandardCharge] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(charge?.name ?? "");
    setCategoryId(charge?.chargeCategoryId ?? "");
    setUnitId(charge?.unitTypeId ?? "");
    setTaxCategoryId(charge?.taxCategoryId ?? "");
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
      unitTypeId: unitId || null,
      taxCategoryId: taxCategoryId || null,
      standardCharge: Number(standardCharge) || 0,
    };
    const res = charge
      ? await apiClient.patch(`/api/dashboard/charges/${charge._id}`, body)
      : await apiClient.post("/api/dashboard/charges", body);
    if (res.success) {
      toast.success(charge ? "Charge updated" : "Charge added");
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
        className="sm:max-w-none sm:w-[min(92vw,520px)] p-0 overflow-hidden gap-0"
      >
        <div className="bg-blue-600 text-white flex items-center justify-between px-5 py-3.5">
          <h2 className="text-base font-semibold">
            {charge ? "Edit Charge" : "Add Charges"}
          </h2>
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
            <Label className="text-xs text-gray-500">Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500">Charge Category</Label>
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
              <Label className="text-xs text-gray-500">Unit</Label>
              <SearchableSelect
                value={unitId}
                onValueChange={setUnitId}
                options={units.map((u) => ({ value: u._id, label: u.name }))}
                placeholder="Select unit"
                triggerClassName="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500">Tax Category</Label>
              <SearchableSelect
                value={taxCategoryId}
                onValueChange={setTaxCategoryId}
                options={taxCategories.map((t) => ({
                  value: t._id,
                  label: t.name,
                  sub: `${t.percent}%`,
                }))}
                placeholder="Select tax category"
                triggerClassName="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500">Standard Charge</Label>
              <Input
                type="number"
                min={0}
                value={standardCharge}
                onChange={(e) => setStandardCharge(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && save()}
              />
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
  );
}
