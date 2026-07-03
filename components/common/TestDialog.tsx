"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { useCurrency } from "@/lib/context";
import { apiClient } from "@/lib/apiClient";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { DiagnosticTest } from "@/lib/types/diagnosticTest";
import type { Charge, ChargeCategoryItem } from "@/lib/types/charges";

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
  const [shortName, setShortName] = useState(test?.shortName ?? "");
  const [testType, setTestType] = useState(test?.testType ?? "");
  const [method, setMethod] = useState(test?.method ?? "");
  const [chargeCategoryId, setChargeCategoryId] = useState("");
  const [chargeId, setChargeId] = useState(test?.chargeId ?? "");
  const [reportDays, setReportDays] = useState(String(test?.reportDays ?? 0));
  const [tax, setTax] = useState(String(test?.tax ?? 0));
  const [standardCharge, setStandardCharge] = useState(
    String(test?.standardCharge ?? 0),
  );
  const [submitting, setSubmitting] = useState(false);

  const [categories, setCategories] = useState<ChargeCategoryItem[]>([]);
  const [charges, setCharges] = useState<Charge[]>([]);

  useEffect(() => {
    Promise.all([
      apiClient.get<ChargeCategoryItem[]>(
        `/api/dashboard/charge-categories?module=${module}`,
      ),
      apiClient.get<Charge[]>(`/api/dashboard/charges?module=${module}`),
    ]).then(([catRes, chargeRes]) => {
      if (catRes.success) setCategories(catRes.data);
      else toast.error(catRes.error);
      if (chargeRes.success) setCharges(chargeRes.data);
      else toast.error(chargeRes.error);
    });
  }, [module]);

  // Editing an existing test: once charges load, resolve the linked charge's
  // category so the category dropdown starts pre-selected.
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
    setTax("0");
  }

  function handleChargeChange(id: string) {
    setChargeId(id);
    const c = charges.find((c) => c._id === id);
    if (c) {
      setStandardCharge(String(c.standardCharge));
      setTax(String(c.taxPercent ?? 0));
    }
  }

  const charge = Number(standardCharge) || 0;
  const taxPct = Number(tax) || 0;
  const amount = charge + (charge * taxPct) / 100;

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Test name is required");
      return;
    }
    if (!shortName.trim()) {
      toast.error("Short name is required");
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        name: name.trim(),
        shortName: shortName.trim(),
        testType,
        chargeId: chargeId || undefined,
        method,
        reportDays: Number(reportDays),
        tax: Number(tax),
        standardCharge: charge,
        amount,
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
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl flex flex-col"
        style={{ maxHeight: "90vh" }}
      >
        {/* Header */}
        <div className="bg-primary-600 text-white flex items-center justify-between px-5 py-3 rounded-t-xl shrink-0">
          <h2 className="text-base font-medium">
            {test ? "Edit Test Details" : "Add Test Details"}
          </h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {/* Row 1 */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={lbl}>
                Test Name <span className="text-danger-500">*</span>
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inp}
              />
            </div>
            <div>
              <label className={lbl}>
                Short Name <span className="text-danger-500">*</span>
              </label>
              <input
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
                className={inp}
              />
            </div>
            <div>
              <label className={lbl}>Test Type</label>
              <input
                value={testType}
                onChange={(e) => setTestType(e.target.value)}
                className={inp}
              />
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className={lbl}>Method</label>
              <input
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className={inp}
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
            <div>
              <label className={lbl}>Charge Category</label>
              <SearchableSelect
                value={chargeCategoryId}
                onValueChange={handleCategoryChange}
                options={categories.map((c) => ({
                  value: c._id,
                  label: c.name,
                }))}
                placeholder="Select"
                triggerClassName="h-9 text-sm"
              />
            </div>
            <div>
              <label className={lbl}>Charge Name</label>
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

          {/* Row 3 */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={lbl}>Tax (%)</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={tax}
                  onChange={(e) => setTax(e.target.value)}
                  className={inp + " pr-7"}
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                  %
                </span>
              </div>
            </div>
            <div>
              <label className={lbl}>
                Standard Charge ({sym}) <span className="text-danger-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                value={standardCharge}
                onChange={(e) => setStandardCharge(e.target.value)}
                className={inp}
              />
            </div>
            <div>
              <label className={lbl}>Amount ({sym})</label>
              <input
                value={amount.toFixed(2)}
                readOnly
                className={inp + " bg-gray-50 text-gray-500"}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-5 py-3 flex justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={submitting}
            className="flex items-center gap-1.5 px-5 py-2 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-lg disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
