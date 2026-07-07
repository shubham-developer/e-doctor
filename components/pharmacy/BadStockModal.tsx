"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormDialog } from "@/components/common/FormDialog";
import { apiClient } from "@/lib/apiClient";
import type { Medicine } from "./types";

export function BadStockModal({
  medicine,
  onClose,
  onSaved,
}: {
  medicine: Medicine | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [batchNo, setBatchNo] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [outwardDate, setOutwardDate] = useState(
    format(new Date(), "yyyy-MM-dd"),
  );
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (medicine) {
      setBatchNo(medicine.batchNo ?? "");
      setExpiryDate(medicine.expiryDate ?? "");
      setOutwardDate(format(new Date(), "yyyy-MM-dd"));
      setNote("");
    }
  }, [medicine]);

  async function handleSave() {
    if (!outwardDate) {
      toast.error("Outward date is required");
      return;
    }
    setSaving(true);
    try {
      const data = await apiClient.post("/api/dashboard/pharmacy/bad-stock", {
        medicineId: medicine!._id,
        batchNo,
        expiryDate,
        outwardDate,
        note,
      });
      if (!data.success) {
        toast.error(data.error);
        return;
      }
      toast.success("Bad stock recorded");
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormDialog
      open={!!medicine}
      onClose={onClose}
      title="Add Bad Stock"
      contentClassName="sm:w-[min(92vw,680px)]"
      footer={
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-primary-600 hover:bg-primary-700 flex items-center gap-1.5"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          {saving ? "Saving…" : "Save"}
        </Button>
      }
    >
      <div className="px-5 py-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-xs font-medium text-gray-700 mb-1">
              Batch No
            </Label>
            <Input
              value={batchNo}
              onChange={(e) => setBatchNo(e.target.value)}
              className="h-9"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-700 mb-1">
              Expiry Date
            </Label>
            <Input
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="h-9"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-700 mb-1">
              Outward Date <span className="text-danger-500">*</span>
            </Label>
            <Input
              type="date"
              value={outwardDate}
              onChange={(e) => setOutwardDate(e.target.value)}
              className="h-9"
            />
          </div>
        </div>
        <div>
          <Label className="text-xs font-medium text-gray-700 mb-1">Note</Label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="text-sm resize-none"
          />
        </div>
      </div>
    </FormDialog>
  );
}
