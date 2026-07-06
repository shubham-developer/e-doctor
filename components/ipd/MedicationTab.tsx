"use client";

import { useEffect, useState, useRef } from "react";
import { useCurrency } from "@/lib/context";
import { apiClient } from "@/lib/apiClient";
import { useApiQuery } from "@/lib/useApiQuery";
import { Plus, Trash2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MedicineOption {
  _id: string;
  name: string;
  salePrice: number;
  availableQty: number;
  unit?: string;
  company?: string;
}
interface IpdMedication {
  _id: string;
  medicineName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  date: string;
  note?: string;
  addedByName?: string;
}

export function MedicationTab({ ipdId }: { ipdId: string }) {
  const { fmt } = useCurrency();
  const [results, setResults] = useState<MedicineOption[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [selected, setSelected] = useState<MedicineOption | null>(null);
  const [qty, setQty] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [medDate, setMedDate] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: medicationsData, refetch: loadMedications } = useApiQuery<
    IpdMedication[]
  >(["ipd-medications", ipdId], `/api/dashboard/ipd/${ipdId}/medications`);
  const medications = medicationsData ?? [];

  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    if (!searchInput.trim()) {
      setResults([]);
      return;
    }
    searchRef.current = setTimeout(async () => {
      const d = await apiClient.get<{ medicines: MedicineOption[] }>(
        `/api/dashboard/pharmacy/medicines?search=${encodeURIComponent(searchInput)}&limit=20`,
      );
      if (d.success) setResults(d.data.medicines);
    }, 300);
  }, [searchInput]);

  function pickMedicine(m: MedicineOption) {
    setSelected(m);
    setSearchInput(m.name);
    setUnitPrice(String(m.salePrice));
    setResults([]);
  }

  function resetForm() {
    setSelected(null);
    setSearchInput("");
    setUnitPrice("");
    setQty("1");
    setNote("");
    setMedDate("");
    setResults([]);
  }

  async function handleAdd() {
    if (!searchInput.trim() || !unitPrice) return;
    setSaving(true);
    try {
      const d = await apiClient.post(
        `/api/dashboard/ipd/${ipdId}/medications`,
        {
          medicineId: selected?._id,
          medicineName: selected?.name ?? searchInput.trim(),
          quantity: Number(qty),
          unitPrice: Number(unitPrice),
          note,
          date: medDate,
        },
      );
      if (d.success) {
        await loadMedications();
        setShowForm(false);
        resetForm();
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteMedication(id: string) {
    await apiClient.delete(`/api/dashboard/ipd/${ipdId}/medications/${id}`);
    loadMedications();
  }

  const total = medications.reduce((s, m) => s + m.total, 0);
  const inp =
    "h-8 w-full px-2 text-xs border border-gray-300 rounded focus:border-primary-400 focus:ring-1 focus:ring-primary-100 outline-none bg-white";
  const lbl = "block text-2xs font-semibold text-gray-500 uppercase mb-1";

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-800">
            Total Medication:
          </span>
          <span className="text-sm font-bold text-primary-700">{fmt(total)}</span>
          <span className="text-xs text-gray-400">
            (added to Charges automatically)
          </span>
        </div>
        <Button
          size="sm"
          onClick={() => {
            resetForm();
            setShowForm((v) => !v);
          }}
        >
          <Plus className="w-3.5 h-3.5" /> Add Medicine
        </Button>
      </div>

      {showForm && (
        <div className="border border-primary-200 bg-primary-50/40 rounded-lg p-4 space-y-3">
          <p className="text-xs font-semibold text-primary-700">Add Medicine</p>
          <div className="grid grid-cols-2 gap-3">
            {/* Medicine search */}
            <div className="col-span-2 relative">
              <label className={lbl}>
                Medicine Name <span className="text-danger-500">*</span>
              </label>
              <input
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setSelected(null);
                }}
                className={inp}
                placeholder="Search medicine..."
                autoComplete="off"
              />
              {results.length > 0 && (
                <div className="absolute z-20 top-full left-0 right-0 mt-0.5 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {results.map((m) => (
                    <button
                      key={m._id}
                      type="button"
                      onClick={() => pickMedicine(m)}
                      className="w-full text-left px-3 py-2 hover:bg-primary-50 transition-colors"
                    >
                      <p className="text-xs font-medium text-gray-800">
                        {m.name}
                      </p>
                      <p className="text-2xs text-gray-400">
                        {m.company ? `${m.company} · ` : ""}
                        {m.unit ?? ""} · Stock: {m.availableQty} · ₹
                        {m.salePrice}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className={lbl}>Quantity</label>
              <input
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className={inp}
              />
            </div>
            <div>
              <label className={lbl}>
                Unit Price <span className="text-danger-500">*</span>
              </label>
              <input
                type="number"
                min={0}
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                className={inp}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className={lbl}>Date</label>
              <input
                type="date"
                value={medDate}
                onChange={(e) => setMedDate(e.target.value)}
                className={inp}
              />
            </div>
            <div>
              <label className={lbl}>Note</label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className={inp}
                placeholder="Optional..."
              />
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-gray-500">
              Total:{" "}
              <span className="font-semibold text-gray-900">
                {fmt((Number(qty) || 0) * (Number(unitPrice) || 0))}
              </span>
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAdd}
                disabled={saving || !searchInput.trim() || !unitPrice}
              >
                {saving ? "Adding…" : "Add"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {medications.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
          <FileText className="w-10 h-10 opacity-20" />
          <p className="text-sm">No medications added yet</p>
          <p className="text-xs">
            Added medicines are automatically billed in Charges
          </p>
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
                  Medicine
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
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  By
                </th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {medications.map((m) => (
                <tr key={m._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-500">{m.date}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-800">
                      {m.medicineName}
                    </p>
                    {m.note && (
                      <p className="text-xs text-gray-400">{m.note}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-700">
                    {m.quantity}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-700">
                    {fmt(m.unitPrice)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                    {fmt(m.total)}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {m.addedByName || "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => deleteMedication(m._id)}
                      className="text-gray-400 hover:text-danger-500 hover:bg-danger-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
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
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
