"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormDialog } from "@/components/common/FormDialog";
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
    <FormDialog
      open={open}
      onClose={onClose}
      title={editItem ? "Edit Payment" : "New Payment"}
      contentClassName="sm:w-[min(92vw,460px)]"
      footer={
        <>
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
        </>
      }
    >
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
    </FormDialog>
  );
}
