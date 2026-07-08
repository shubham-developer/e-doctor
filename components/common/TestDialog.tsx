"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { useCurrency } from "@/lib/context";
import { apiClient } from "@/lib/apiClient";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Button } from "@/components/ui/button";
import { useCharges } from "@/lib/lookups";
import type { DiagnosticTest } from "@/lib/types/diagnosticTest";
import type { ChargeCategoryItem } from "@/lib/types/charges";

/** Shared Add/Edit dialog for Pathology and Radiology tests. */
export function TestDialog({
  test,
  apiBase,
  module,
  onClose,
  onSaved,
}: {
  test?: DiagnosticTest | null;
  apiBase: string;
  module: "pathology" | "radiology";
  onClose: () => void;
  onSaved: (t: DiagnosticTest) => void;
}) {
  const { sym } = useCurrency();

  const [name, setName] = useState(test?.name ?? "");
  const [chargeCategoryId, setChargeCategoryId] = useState("");
  const [chargeId, setChargeId] = useState(test?.chargeId ?? "");
  const [reportDays, setReportDays] = useState(String(test?.reportDays ?? 0));
  const [standardCharge, setStandardCharge] = useState(
    String(test?.standardCharge ?? 0),
  );
  const [submitting, setSubmitting] = useState(false);

  const [categories, setCategories] = useState<ChargeCategoryItem[]>([]);
  const { data: chargesData } = useCharges(module);
  const charges = chargesData ?? [];

  useEffect(() => {
    apiClient
      .get<ChargeCategoryItem[]>(
        `/api/dashboard/charge-categories?module=${module}`,
      )
      .then((catRes) => {
        if (catRes.success) setCategories(catRes.data);
        else toast.error(catRes.error);
      });
  }, [module]);

  // Pre-select category when editing an existing test
  useEffect(() => {
    if (!test?.chargeId || charges.length === 0) return;
    const c = charges.find((c) => c._id === test.chargeId);
    if (c?.chargeCategoryId) setChargeCategoryId(c.chargeCategoryId);
  }, [test, charges]);

  const chargesInCategory = chargeCategoryId
    ? charges.filter((c) => c.chargeCategoryId === chargeCategoryId)
    : [];

  function handleCategoryChange(id: string) {
    setChargeCategoryId(id);
    setChargeId("");
    setStandardCharge("0");
  }

  function handleChargeChange(id: string) {
    setChargeId(id);
    const c = charges.find((c) => c._id === id);
    if (c) setStandardCharge(String(c.standardCharge));
  }

  const charge = Number(standardCharge) || 0;

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Test name is required");
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        name: name.trim(),
        chargeId: chargeId || undefined,
        reportDays: Number(reportDays),
        standardCharge: charge,
        amount: charge,
      };
      const res = test
        ? await apiClient.patch<DiagnosticTest>(`${apiBase}/${test._id}`, body)
        : await apiClient.post<DiagnosticTest>(apiBase, body);
      if (!res.success) {
        toast.error(res.error ?? "Failed to save");
        return;
      }
      toast.success(test ? "Test updated" : "Test added");
      onSaved(res.data);
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  const inp =
    "h-9 text-sm border border-gray-300 rounded-md px-2.5 w-full focus:outline-none focus:border-primary-400 bg-white";
  const lbl = "block text-xs font-medium text-gray-700 mb-1";

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col">
        {/* Header */}
        <div className="bg-primary-600 text-white flex items-center justify-between px-5 py-3 rounded-t-xl">
          <h2 className="text-base font-medium">
            {test ? "Edit Test Details" : "Add Test Details"}
          </h2>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Row 1: Test Name + Report Days */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>
                Test Name <span className="text-danger-500">*</span>
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inp}
                autoFocus
              />
            </div>
            <div>
              <label className={lbl}>
                Report Days <span className="text-danger-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                value={reportDays}
                onChange={(e) => setReportDays(e.target.value)}
                className={inp}
              />
            </div>
          </div>

          {/* Row 2: Charge Category + Service Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Service Category</label>
              <SearchableSelect
                value={chargeCategoryId}
                onValueChange={handleCategoryChange}
                options={categories.map((c) => ({
                  value: c._id,
                  label: c.name,
                }))}
                placeholder="Select category"
                triggerClassName="h-9 text-sm"
              />
            </div>
            <div>
              <label className={lbl}>Service Name</label>
              <SearchableSelect
                value={chargeId}
                onValueChange={handleChargeChange}
                options={chargesInCategory.map((c) => ({
                  value: c._id,
                  label: c.name,
                }))}
                placeholder={
                  chargeCategoryId ? "Select" : "Select category first"
                }
                disabled={!chargeCategoryId}
                triggerClassName="h-9 text-sm"
              />
            </div>
          </div>

          {/* Row 3: Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>
                Price ({sym}) <span className="text-danger-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                value={standardCharge}
                onChange={(e) => setStandardCharge(e.target.value)}
                className={inp}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-5 py-3 flex justify-end gap-2">
          <Button
            variant="outline"
            className="border-primary-600 text-primary-600 hover:bg-primary-50 hover:text-primary-700"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            className="bg-primary-600 hover:bg-primary-700"
            onClick={handleSave}
            disabled={submitting}
          >
            {submitting ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
