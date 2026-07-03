"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiClient } from "@/lib/apiClient";
import { Plus, Pencil, Trash2, Layers, Tag, X } from "lucide-react";
import type { ChargeCategoryItem, Charge } from "@/lib/types/charges";

const ALL_MODULES = [
  { key: "opd", label: "OPD" },
  { key: "ipd", label: "IPD" },
  { key: "pharmacy", label: "Pharmacy" },
  { key: "pathology", label: "Pathology" },
  { key: "radiology", label: "Radiology" },
];

const MODULE_COLORS: Record<string, string> = {
  opd: "bg-blue-100 text-blue-700",
  ipd: "bg-purple-100 text-purple-700",
  pharmacy: "bg-green-100 text-green-700",
  pathology: "bg-amber-100 text-amber-700",
  radiology: "bg-rose-100 text-rose-700",
};

type Tab = "categories" | "services";

// ---------- Category modal ----------
function CategoryModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: ChargeCategoryItem | null;
  onSave: (name: string, appliesTo: string[]) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [appliesTo, setAppliesTo] = useState<string[]>(initial?.appliesTo ?? []);
  const [saving, setSaving] = useState(false);

  function toggle(key: string) {
    setAppliesTo((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  async function handleSave() {
    if (!name.trim()) { toast.error("Name is required"); return; }
    if (appliesTo.length === 0) { toast.error("Select at least one module"); return; }
    setSaving(true);
    await onSave(name.trim(), appliesTo);
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">
            {initial ? "Edit Service Category" : "New Service Category"}
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Category Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Consultation, Bed Charges, Lab Tests"
              className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg focus:border-primary-400 focus:ring-1 focus:ring-primary-100 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">
              Applies To <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {ALL_MODULES.map((m) => {
                const checked = appliesTo.includes(m.key);
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => toggle(m.key)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                      checked
                        ? "bg-primary-600 text-white border-primary-600"
                        : "bg-white text-gray-600 border-gray-300 hover:border-primary-400"
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-xs bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium"
          >
            {saving ? "Saving…" : initial ? "Update" : "Add Category"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Service modal ----------
function ServiceModal({
  initial,
  categories,
  onSave,
  onClose,
}: {
  initial?: Charge | null;
  categories: ChargeCategoryItem[];
  onSave: (name: string, categoryId: string, price: number) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [categoryId, setCategoryId] = useState(initial?.chargeCategoryId ?? "");
  const [price, setPrice] = useState(initial?.standardCharge != null ? String(initial.standardCharge) : "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) { toast.error("Service name is required"); return; }
    if (!categoryId) { toast.error("Select a category"); return; }
    setSaving(true);
    await onSave(name.trim(), categoryId, Number(price) || 0);
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">
            {initial ? "Edit Service" : "New Service"}
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Service Category <span className="text-red-500">*</span>
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg focus:border-primary-400 outline-none bg-white"
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                  {c.appliesTo?.length
                    ? ` (${c.appliesTo.map((k) => ALL_MODULES.find((m) => m.key === k)?.label ?? k).join(", ")})`
                    : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Service Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. General Consultation, X-Ray Chest PA"
              className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg focus:border-primary-400 focus:ring-1 focus:ring-primary-100 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Price (₹)
            </label>
            <input
              type="number"
              value={price}
              min={0}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg focus:border-primary-400 focus:ring-1 focus:ring-primary-100 outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-xs bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium"
          >
            {saving ? "Saving…" : initial ? "Update" : "Add Service"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Main page ----------
export default function ServicesSettingsPage() {
  const [tab, setTab] = useState<Tab>("categories");

  const [categories, setCategories] = useState<ChargeCategoryItem[]>([]);
  const [services, setServices] = useState<Charge[]>([]);
  const [loadingCats, setLoadingCats] = useState(false);
  const [loadingSvcs, setLoadingSvcs] = useState(false);

  const [catModal, setCatModal] = useState<ChargeCategoryItem | null | false>(false);
  const [svcModal, setSvcModal] = useState<Charge | null | false>(false);

  async function loadCategories() {
    setLoadingCats(true);
    const d = await apiClient.get<ChargeCategoryItem[]>("/api/dashboard/charge-categories");
    if (d.success) setCategories(d.data);
    else toast.error(d.error ?? "Failed to load categories");
    setLoadingCats(false);
  }

  async function loadServices() {
    setLoadingSvcs(true);
    const d = await apiClient.get<Charge[]>("/api/dashboard/charges");
    if (d.success) setServices(d.data);
    else toast.error(d.error ?? "Failed to load services");
    setLoadingSvcs(false);
  }

  useEffect(() => {
    loadCategories();
    loadServices();
  }, []);

  // ---------- Category CRUD ----------
  async function saveCategory(name: string, appliesTo: string[]) {
    const editing = catModal && catModal !== null && typeof catModal === "object" ? catModal : null;
    let d;
    if (editing) {
      d = await apiClient.patch(`/api/dashboard/charge-categories/${editing._id}`, { name, appliesTo });
    } else {
      d = await apiClient.post("/api/dashboard/charge-categories", { name, appliesTo });
    }
    if (!d.success) { toast.error(d.error ?? "Failed to save"); return; }
    toast.success(editing ? "Category updated" : "Category added");
    setCatModal(false);
    loadCategories();
  }

  async function deleteCategory(id: string) {
    const d = await apiClient.delete(`/api/dashboard/charge-categories/${id}`);
    if (!d.success) { toast.error(d.error ?? "Failed to delete"); return; }
    toast.success("Category deleted");
    loadCategories();
  }

  // ---------- Service CRUD ----------
  async function saveService(name: string, categoryId: string, price: number) {
    const editing = svcModal && svcModal !== null && typeof svcModal === "object" ? svcModal : null;
    let d;
    if (editing) {
      d = await apiClient.patch(`/api/dashboard/charges/${editing._id}`, {
        name,
        chargeCategoryId: categoryId,
        standardCharge: price,
      });
    } else {
      d = await apiClient.post("/api/dashboard/charges", {
        name,
        chargeCategoryId: categoryId,
        standardCharge: price,
      });
    }
    if (!d.success) { toast.error(d.error ?? "Failed to save"); return; }
    toast.success(editing ? "Service updated" : "Service added");
    setSvcModal(false);
    loadServices();
  }

  async function deleteService(id: string) {
    const d = await apiClient.delete(`/api/dashboard/charges/${id}`);
    if (!d.success) { toast.error(d.error ?? "Failed to delete"); return; }
    toast.success("Service deleted");
    loadServices();
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-800">Services</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Define service categories and services. Assign them to modules — they&apos;ll
            auto-populate in OPD, IPD, and other billing forms.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-0">
        <button
          onClick={() => setTab("categories")}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors ${
            tab === "categories"
              ? "border-primary-600 text-primary-700"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Service Categories
          <span className="ml-1 px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full text-2xs">
            {categories.length}
          </span>
        </button>
        <button
          onClick={() => setTab("services")}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors ${
            tab === "services"
              ? "border-primary-600 text-primary-700"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          Services
          <span className="ml-1 px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full text-2xs">
            {services.length}
          </span>
        </button>
      </div>

      {/* Categories tab */}
      {tab === "categories" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button
              onClick={() => setCatModal(null)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Category
            </button>
          </div>

          {loadingCats ? (
            <div className="h-48 flex items-center justify-center text-xs text-gray-400">
              Loading…
            </div>
          ) : categories.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-gray-400 gap-2">
              <Layers className="w-10 h-10 opacity-20" />
              <p className="text-sm">No service categories yet</p>
              <p className="text-xs">Click &quot;Add Category&quot; to create one</p>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Category Name
                    </th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Applies To
                    </th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Services
                    </th>
                    <th className="px-4 py-2.5 w-20" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {categories.map((cat) => {
                    const svcCount = services.filter(
                      (s) => s.chargeCategoryId === cat._id,
                    ).length;
                    return (
                      <tr key={cat._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-800 text-sm">
                          {cat.name}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {cat.appliesTo?.length ? (
                              cat.appliesTo.map((k) => (
                                <span
                                  key={k}
                                  className={`px-2 py-0.5 text-2xs font-medium rounded-full ${MODULE_COLORS[k] ?? "bg-gray-100 text-gray-600"}`}
                                >
                                  {ALL_MODULES.find((m) => m.key === k)?.label ?? k}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {svcCount} service{svcCount !== 1 ? "s" : ""}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setCatModal(cat)}
                              className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-primary-600 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteCategory(cat._id)}
                              className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Services tab */}
      {tab === "services" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">
              Services auto-populate in their assigned module&apos;s billing form.
            </p>
            <button
              onClick={() => setSvcModal(null)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Service
            </button>
          </div>

          {loadingSvcs ? (
            <div className="h-48 flex items-center justify-center text-xs text-gray-400">
              Loading…
            </div>
          ) : services.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-gray-400 gap-2">
              <Tag className="w-10 h-10 opacity-20" />
              <p className="text-sm">No services yet</p>
              <p className="text-xs">Add a category first, then add services under it</p>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Service Name
                    </th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Category
                    </th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Modules
                    </th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Price (₹)
                    </th>
                    <th className="px-4 py-2.5 w-20" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {services.map((svc) => {
                    const cat = categories.find((c) => c._id === svc.chargeCategoryId);
                    return (
                      <tr key={svc._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-800 text-sm">
                          {svc.name}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {svc.chargeCategoryName ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {cat?.appliesTo?.length ? (
                              cat.appliesTo.map((k) => (
                                <span
                                  key={k}
                                  className={`px-2 py-0.5 text-2xs font-medium rounded-full ${MODULE_COLORS[k] ?? "bg-gray-100 text-gray-600"}`}
                                >
                                  {ALL_MODULES.find((m) => m.key === k)?.label ?? k}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">
                          ₹{svc.standardCharge.toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setSvcModal(svc)}
                              className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-primary-600 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteService(svc._id)}
                              className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Category modal */}
      {catModal !== false && (
        <CategoryModal
          initial={catModal}
          onSave={saveCategory}
          onClose={() => setCatModal(false)}
        />
      )}

      {/* Service modal */}
      {svcModal !== false && (
        <ServiceModal
          initial={svcModal}
          categories={categories}
          onSave={saveService}
          onClose={() => setSvcModal(false)}
        />
      )}

    </div>
  );
}
