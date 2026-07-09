"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { IpdPayment } from "@/components/ipd/types";

const PAYMENT_MODES = [
  "Cash",
  "Card",
  "UPI",
  "Insurance",
  "Cheque",
  "Bank Transfer",
  "Other",
];

export function AddPaymentDialog({
  ipdId,
  open,
  editItem,
  onClose,
  onSaved,
}: {
  ipdId: string;
  open: boolean;
  editItem: IpdPayment | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState("Cash");
  const [payNote, setPayNote] = useState("");
  const [payDate, setPayDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAmount(editItem ? String(editItem.amount) : "");
    setMode(editItem?.paymentMode ?? "Cash");
    setPayNote(editItem?.note ?? "");
    setPayDate(editItem?.date ?? "");
  }, [open, editItem]);

  async function handleSave() {
    if (!amount || Number(amount) <= 0) return;
    setSaving(true);
    try {
      const payload = {
        amount: Number(amount),
        paymentMode: mode,
        note: payNote,
        date: payDate,
      };
      const d = editItem
        ? await apiClient.patch(
            `/api/dashboard/ipd/${ipdId}/payments/${editItem._id}`,
            payload,
          )
        : await apiClient.post(`/api/dashboard/ipd/${ipdId}/payments`, payload);
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

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-none sm:w-[min(92vw,460px)] p-0 overflow-hidden gap-0">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <DialogTitle>{editItem ? "Edit Payment" : "New Payment"}</DialogTitle>
        </div>

        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>
                Amount <span className="text-danger-500">*</span>
              </label>
              <Input
                type="number"
                value={amount}
                min={0}
                onChange={(e) => setAmount(e.target.value)}
                className={inp}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className={lbl}>Date</label>
              <Input
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                className={inp}
              />
            </div>
            <div>
              <label className={lbl}>Payment Mode</label>
              <SearchableSelect
                value={mode}
                onValueChange={setMode}
                options={PAYMENT_MODES.map((m) => ({ value: m, label: m }))}
                triggerClassName="h-8 text-xs"
                clearable={false}
              />
            </div>
            <div>
              <label className={lbl}>Note (optional)</label>
              <Input
                value={payNote}
                onChange={(e) => setPayNote(e.target.value)}
                className={inp}
                placeholder="Note..."
              />
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 px-5 py-3 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !amount || Number(amount) <= 0}
          >
            {saving ? "Saving…" : editItem ? "Update" : "Record Payment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
