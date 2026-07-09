"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { apiClient } from "@/lib/apiClient";
import { useCurrency } from "@/lib/context";
import { useCharges } from "@/lib/lookups";
import type { DiagnosticTest } from "@/lib/types/diagnosticTest";
import type { IpdCharge } from "@/components/ipd/types";

interface ServiceOption {
  _id: string;
  name: string;
  price: number;
}

// Virtual categories that pull from their own module APIs instead of charges
const MODULE_CATEGORIES = [
  { key: "__pathology__", label: "Pathology Tests" },
  { key: "__radiology__", label: "Radiology Tests" },
];

export function AddChargeDialog({
  ipdId,
  open,
  editItem,
  onClose,
  onSaved,
}: {
  ipdId: string;
  open: boolean;
  editItem: IpdCharge | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { sym, fmt } = useCurrency();
  const { data: allServicesData } = useCharges();
  const allServices = allServicesData ?? [];

  const [moduleOptions, setModuleOptions] = useState<ServiceOption[]>([]);
  const [loadingModule, setLoadingModule] = useState(false);
  const [saving, setSaving] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [qty, setQty] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [chargeDate, setChargeDate] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    setSelectedCategory("");
    setSelectedServiceId("");
    setModuleOptions([]);
    setQty(editItem ? String(editItem.quantity) : "1");
    setUnitPrice(editItem ? String(editItem.unitPrice) : "");
    setChargeDate(editItem?.date ?? "");
    setNote(editItem?.note ?? "");
  }, [open, editItem]);

  // Unique charge categories from the services module
  const serviceCategories = Array.from(
    new Map(
      allServices
        .filter((s) => s.chargeCategoryName)
        .map((s) => [s.chargeCategoryName!, s.chargeCategoryName!]),
    ).values(),
  ).sort();

  const isModuleCategory = MODULE_CATEGORIES.some(
    (m) => m.key === selectedCategory,
  );

  // Services shown in the second dropdown
  const filteredServices: ServiceOption[] = isModuleCategory
    ? moduleOptions
    : (selectedCategory
        ? allServices.filter((s) => s.chargeCategoryName === selectedCategory)
        : allServices
      ).map((s) => ({ _id: s._id, name: s.name, price: s.standardCharge }));

  async function onCategoryChange(cat: string) {
    setSelectedCategory(cat);
    setSelectedServiceId("");
    setUnitPrice("");
    setModuleOptions([]);

    if (cat === "__pathology__") {
      setLoadingModule(true);
      const d = await apiClient.get<{ tests: DiagnosticTest[] }>(
        "/api/dashboard/pathology/tests",
      );
      if (d.success)
        setModuleOptions(
          d.data.tests.map((t) => ({
            _id: t._id,
            name: t.name,
            price: t.amount || t.standardCharge,
          })),
        );
      setLoadingModule(false);
    } else if (cat === "__radiology__") {
      setLoadingModule(true);
      const d = await apiClient.get<{ tests: DiagnosticTest[] }>(
        "/api/dashboard/radiology/tests",
      );
      if (d.success)
        setModuleOptions(
          d.data.tests.map((t) => ({
            _id: t._id,
            name: t.name,
            price: t.amount || t.standardCharge,
          })),
        );
      setLoadingModule(false);
    }
  }

  function onServiceChange(serviceId: string) {
    setSelectedServiceId(serviceId);
    const opt = filteredServices.find((s) => s._id === serviceId);
    if (opt) setUnitPrice(String(opt.price));
  }

  const selectedServiceName =
    filteredServices.find((s) => s._id === selectedServiceId)?.name ?? "";

  async function handleSave() {
    if (!selectedServiceId && !editItem) {
      toast.error("Please select a service");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        categoryName: editItem?.categoryName ?? selectedServiceName,
        quantity: Number(qty),
        unitPrice: Number(unitPrice),
        note,
        date: chargeDate,
      };
      const d = editItem
        ? await apiClient.patch(
            `/api/dashboard/ipd/${ipdId}/charges/${editItem._id}`,
            payload,
          )
        : await apiClient.post(`/api/dashboard/ipd/${ipdId}/charges`, payload);
      if (d.success) {
        onSaved();
        onClose();
      } else
        toast.error(
          (d as { error?: string }).error ??
            (editItem ? "Failed to update" : "Failed to add"),
        );
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "h-9 text-xs w-full";
  const lbl =
    "block text-2xs font-semibold text-gray-500 uppercase tracking-wide mb-1";
  const lineTotal = (Number(qty) || 0) * (Number(unitPrice) || 0);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-none sm:w-[min(92vw,520px)] p-0 overflow-hidden gap-0">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <DialogTitle>{editItem ? "Edit Charge" : "New Charge"}</DialogTitle>
        </div>

        <div className="p-5 space-y-4">
          {editItem ? (
            <div>
              <label className={lbl}>Service</label>
              <div className="h-9 px-2.5 flex items-center text-xs font-medium text-gray-800 bg-gray-50 border border-gray-200 rounded-lg">
                {editItem.categoryName}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {/* Category picker */}
              <div>
                <label className={lbl}>
                  Category <span className="text-danger-500">*</span>
                </label>
                <SearchableSelect
                  value={selectedCategory}
                  onValueChange={onCategoryChange}
                  options={[
                    { value: "", label: "All services" },
                    ...MODULE_CATEGORIES.map((m) => ({
                      value: m.key,
                      label: m.label,
                    })),
                    ...serviceCategories.map((cat) => ({
                      value: cat,
                      label: cat,
                    })),
                  ]}
                  placeholder="All services"
                  triggerClassName="h-9 text-xs"
                  clearable={false}
                />
              </div>

              {/* Service/test picker */}
              <div>
                <label className={lbl}>
                  Service / Test Name <span className="text-danger-500">*</span>
                </label>
                <SearchableSelect
                  value={selectedServiceId}
                  onValueChange={onServiceChange}
                  options={filteredServices.map((s) => ({
                    value: s._id,
                    label: s.name,
                  }))}
                  placeholder={
                    loadingModule ? "Loading…" : "Select service / test"
                  }
                  disabled={loadingModule || filteredServices.length === 0}
                  triggerClassName="h-9 text-xs"
                  clearable={false}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={lbl}>Date</label>
              <Input
                type="date"
                value={chargeDate}
                onChange={(e) => setChargeDate(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={lbl}>Quantity</label>
              <Input
                type="number"
                value={qty}
                min={1}
                onChange={(e) => setQty(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={lbl}>Unit Price ({sym})</label>
              <Input
                type="number"
                value={unitPrice}
                min={0}
                onChange={(e) => setUnitPrice(e.target.value)}
                className={inputCls}
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className={lbl}>Note (optional)</label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={inputCls}
              placeholder="Note…"
            />
          </div>
        </div>

        <div className="border-t border-gray-100 px-5 py-3 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            Line Total:{" "}
            <span className="font-semibold text-gray-900">
              {fmt(lineTotal)}
            </span>
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || (!editItem && !selectedServiceId)}
            >
              {saving ? "Saving…" : editItem ? "Update" : "Add"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
