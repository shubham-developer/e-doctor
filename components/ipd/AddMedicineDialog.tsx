"use client";

import { useEffect, useRef, useState } from "react";
import { useCurrency } from "@/lib/context";
import { apiClient } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface MedicineOption {
  _id: string;
  name: string;
  salePrice: number;
  availableQty: number;
  unit?: string;
  company?: string;
}

export function AddMedicineDialog({
  ipdId,
  open,
  onClose,
  onSaved,
}: {
  ipdId: string;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { fmt } = useCurrency();
  const [results, setResults] = useState<MedicineOption[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [selected, setSelected] = useState<MedicineOption | null>(null);
  const [qty, setQty] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [medDate, setMedDate] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelected(null);
    setSearchInput("");
    setUnitPrice("");
    setQty("1");
    setNote("");
    setMedDate("");
    setResults([]);
  }, [open]);

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
        onSaved();
        onClose();
      }
    } finally {
      setSaving(false);
    }
  }

  const inp = "h-8 text-xs w-full";
  const lbl = "block text-2xs font-semibold text-gray-500 uppercase mb-1";
  const lineTotal = (Number(qty) || 0) * (Number(unitPrice) || 0);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-none sm:w-[min(92vw,480px)] p-0 overflow-hidden gap-0">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <DialogTitle>Add Medicine</DialogTitle>
        </div>

        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {/* Medicine search */}
            <div className="col-span-2 relative">
              <label className={lbl}>
                Medicine Name <span className="text-danger-500">*</span>
              </label>
              <Input
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
              <Input
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
              <Input
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
              <Input
                type="date"
                value={medDate}
                onChange={(e) => setMedDate(e.target.value)}
                className={inp}
              />
            </div>
            <div>
              <label className={lbl}>Note</label>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className={inp}
                placeholder="Optional..."
              />
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 px-5 py-3 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            Total:{" "}
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
              onClick={handleAdd}
              disabled={saving || !searchInput.trim() || !unitPrice}
            >
              {saving ? "Adding…" : "Add"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
