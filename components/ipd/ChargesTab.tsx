"use client";

import { useEffect, useState, useCallback } from "react";
import { useCurrency } from "@/lib/context";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, IndianRupee, ChevronDown } from "lucide-react";
import type { Charge } from "@/lib/types/charges";
import type { DiagnosticTest } from "@/lib/types/diagnosticTest";
import type { IpdDetail, IpdCharge } from "@/components/ipd/types";

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

export function ChargesTab({
  ipdId,
  admission: _admission,
}: {
  ipdId: string;
  admission: IpdDetail;
}) {
  const { sym, fmt } = useCurrency();

  const [charges, setCharges] = useState<IpdCharge[]>([]);
  // charges from the services module (regular)
  const [allServices, setAllServices] = useState<Charge[]>([]);
  // module-specific test options (loaded on demand)
  const [moduleOptions, setModuleOptions] = useState<ServiceOption[]>([]);
  const [loadingModule, setLoadingModule] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editItem, setEditItem] = useState<IpdCharge | null>(null);

  // form state
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [qty, setQty] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [chargeDate, setChargeDate] = useState("");
  const [note, setNote] = useState("");

  function resetForm() {
    setSelectedCategory("");
    setSelectedServiceId("");
    setModuleOptions([]);
    setQty("1");
    setUnitPrice("");
    setChargeDate("");
    setNote("");
    setEditItem(null);
  }

  const loadCharges = useCallback(async () => {
    const d = await apiClient.get<IpdCharge[]>(
      `/api/dashboard/ipd/${ipdId}/charges`,
    );
    if (d.success) setCharges(d.data);
    else toast.error("Failed to load charges");
  }, [ipdId]);

  useEffect(() => {
    loadCharges();
    apiClient.get<Charge[]>("/api/dashboard/charges").then((d) => {
      if (d.success) setAllServices(d.data);
    });
  }, [loadCharges]);

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
          d.data.tests.map((t) => ({ _id: t._id, name: t.name, price: t.amount || t.standardCharge })),
        );
      setLoadingModule(false);
    } else if (cat === "__radiology__") {
      setLoadingModule(true);
      const d = await apiClient.get<{ tests: DiagnosticTest[] }>(
        "/api/dashboard/radiology/tests",
      );
      if (d.success)
        setModuleOptions(
          d.data.tests.map((t) => ({ _id: t._id, name: t.name, price: t.amount || t.standardCharge })),
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
      if (editItem) {
        const d = await apiClient.patch(
          `/api/dashboard/ipd/${ipdId}/charges/${editItem._id}`,
          payload,
        );
        if (d.success) {
          await loadCharges();
          setShowForm(false);
          resetForm();
        } else toast.error((d as { error?: string }).error ?? "Failed to update");
      } else {
        const d = await apiClient.post(
          `/api/dashboard/ipd/${ipdId}/charges`,
          payload,
        );
        if (d.success) {
          await loadCharges();
          setShowForm(false);
          resetForm();
        } else toast.error((d as { error?: string }).error ?? "Failed to add");
      }
    } finally {
      setSaving(false);
    }
  }

  function startEdit(c: IpdCharge) {
    setEditItem(c);
    setSelectedCategory("");
    setSelectedServiceId("");
    setQty(String(c.quantity));
    setUnitPrice(String(c.unitPrice));
    setNote(c.note ?? "");
    setChargeDate(c.date);
    setShowForm(true);
  }

  async function deleteCharge(id: string) {
    const d = await apiClient.delete(
      `/api/dashboard/ipd/${ipdId}/charges/${id}`,
    );
    if (d.success) loadCharges();
    else toast.error("Failed to delete");
  }

  const total = charges.reduce((s, c) => s + c.total, 0);
  const lineTotal = (Number(qty) || 0) * (Number(unitPrice) || 0);

  const inp =
    "h-9 w-full px-2.5 text-xs border border-gray-300 rounded-lg focus:border-primary-400 focus:ring-1 focus:ring-primary-100 outline-none bg-white";
  const lbl =
    "block text-2xs font-semibold text-gray-500 uppercase tracking-wide mb-1";

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IndianRupee className="w-4 h-4 text-primary-600" />
          <span className="text-sm font-semibold text-gray-800">
            Total Charges:
          </span>
          <span className="text-sm font-bold text-primary-700">{fmt(total)}</span>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm((v) => !v);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add Charge
        </button>
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <div className="border border-primary-200 bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-primary-50 border-b border-primary-100">
            <p className="text-xs font-semibold text-primary-700">
              {editItem ? "Edit Charge" : "New Charge"}
            </p>
          </div>

          <div className="p-4 space-y-4">
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
                  <div className="relative">
                    <select
                      value={selectedCategory}
                      onChange={(e) => onCategoryChange(e.target.value)}
                      className={`${inp} appearance-none pr-7`}
                    >
                      <option value="">All services</option>
                      {/* Module test categories first */}
                      {MODULE_CATEGORIES.map((m) => (
                        <option key={m.key} value={m.key}>
                          {m.label}
                        </option>
                      ))}
                      {/* Divider label (non-selectable) */}
                      {serviceCategories.length > 0 && (
                        <option disabled>── Services ──</option>
                      )}
                      {serviceCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Service/test picker */}
                <div>
                  <label className={lbl}>
                    Service / Test Name <span className="text-danger-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={selectedServiceId}
                      onChange={(e) => onServiceChange(e.target.value)}
                      className={`${inp} appearance-none pr-7`}
                      disabled={loadingModule || filteredServices.length === 0}
                    >
                      <option value="">
                        {loadingModule ? "Loading…" : "Select service / test"}
                      </option>
                      {filteredServices.map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={lbl}>Date</label>
                <input
                  type="date"
                  value={chargeDate}
                  onChange={(e) => setChargeDate(e.target.value)}
                  className={inp}
                />
              </div>
              <div>
                <label className={lbl}>Quantity</label>
                <input
                  type="number"
                  value={qty}
                  min={1}
                  onChange={(e) => setQty(e.target.value)}
                  className={inp}
                />
              </div>
              <div>
                <label className={lbl}>Unit Price ({sym})</label>
                <input
                  type="number"
                  value={unitPrice}
                  min={0}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  className={inp}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className={lbl}>Note (optional)</label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className={inp}
                placeholder="Note…"
              />
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-gray-100">
              <span className="text-xs text-gray-500">
                Line Total:{" "}
                <span className="font-semibold text-gray-900">
                  {fmt(lineTotal)}
                </span>
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || (!editItem && !selectedServiceId)}
                  className="px-3 py-1.5 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50 font-medium"
                >
                  {saving ? "Saving…" : editItem ? "Update" : "Add"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charges table */}
      {charges.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
          <IndianRupee className="w-10 h-10 opacity-20" />
          <p className="text-sm">No charges added yet</p>
          <p className="text-xs">Click "Add Charge" to add a billable item</p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Date
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Service
                </th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Qty
                </th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Unit Price
                </th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Total
                </th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {charges.map((c) => (
                <tr key={c._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {c.date || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-800">
                      {c.categoryName}
                    </p>
                    {c.note && (
                      <p className="text-xs text-gray-400">{c.note}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-gray-700">
                    {c.quantity}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-gray-700">
                    {fmt(c.unitPrice)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                    {fmt(c.total)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => startEdit(c)}
                        className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-primary-600 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteCharge(c._id)}
                        className="p-1 rounded hover:bg-danger-50 text-gray-400 hover:text-danger-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t border-gray-200">
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-2.5 text-xs font-semibold text-gray-600 text-right uppercase tracking-wide"
                >
                  Grand Total
                </td>
                <td className="px-4 py-2.5 text-right text-sm font-bold text-primary-700">
                  {fmt(total)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
