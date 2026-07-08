"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useApp, useDateFormatter, formatAmount } from "@/lib/context";
import { apiClient } from "@/lib/apiClient";
import type { PharmacyBill } from "./types";

export function PaymentModal({
  bill,
  onClose,
  onSaved,
}: {
  bill: PharmacyBill | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { tenant } = useApp();
  const { formatDateTime } = useDateFormatter();
  const symbol = tenant?.currencySymbol || "₹";
  const fmt = (n: number) => formatAmount(n, tenant?.currency);
  const [amount, setAmount] = useState<number | "">("");
  const [mode, setMode] = useState("Cash");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (bill) {
      setAmount("");
      setMode(bill.paymentMode || "Cash");
      setNote("");
    }
  }, [bill]);

  const balance = bill ? Math.max(0, bill.netAmount - bill.paidAmount) : 0;

  async function handleSave() {
    if (!bill) return;
    const amt = Number(amount) || 0;
    if (amt <= 0) {
      toast.error("Enter a valid payment amount");
      return;
    }
    if (amt > balance) {
      toast.error(`Amount exceeds balance due (${fmt(balance)})`);
      return;
    }
    setSaving(true);
    try {
      const data = await apiClient.post(
        `/api/dashboard/pharmacy/bills/${bill._id}/payments`,
        { amount: amt, mode, note },
      );
      if (!data.success) {
        toast.error(data.error);
        return;
      }
      toast.success("Payment recorded");
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={!!bill}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-none sm:w-[min(92vw,560px)] p-0 overflow-hidden gap-0"
      >
        <div className="bg-primary-600 text-white flex items-center justify-between px-5 py-3.5">
          <DialogTitle>Payment — PHARMAB{bill?.billNumber}</DialogTitle>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            className="text-white hover:text-gray-200 hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <span className="block text-xs text-gray-500">Net Amount</span>
              <span className="font-medium">{fmt(bill?.netAmount ?? 0)}</span>
            </div>
            <div>
              <span className="block text-xs text-gray-500">Paid</span>
              <span className="font-medium">{fmt(bill?.paidAmount ?? 0)}</span>
            </div>
            <div>
              <span className="block text-xs text-gray-500">Balance</span>
              <span className="font-medium text-danger-600">
                {fmt(balance)}
              </span>
            </div>
          </div>

          {(bill?.payments?.length ?? 0) > 0 && (
            <div>
              <span className="block text-xs font-medium text-gray-600 mb-1">
                Payment History
              </span>
              <div className="border rounded divide-y max-h-40 overflow-y-auto">
                {bill!.payments.map((p, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-3 py-1.5 text-xs"
                  >
                    <span className="text-gray-500">
                      {formatDateTime(p.createdAt)}
                    </span>
                    <span className="text-gray-600">{p.mode}</span>
                    <span className="font-medium">{fmt(p.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {balance > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Amount ({symbol}) *
                </label>
                <input
                  type="number"
                  min="0"
                  max={balance}
                  value={amount}
                  onChange={(e) =>
                    setAmount(
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                  className="h-9 text-sm border border-gray-300 rounded px-2.5 w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Payment Mode
                </label>
                <SearchableSelect
                  value={mode}
                  onValueChange={setMode}
                  options={["Cash", "Card", "UPI", "Insurance", "Online"].map(
                    (m) => ({ value: m, label: m }),
                  )}
                  clearable={false}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Note
                </label>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="h-9 text-sm border border-gray-300 rounded px-2.5 w-full"
                />
              </div>
            </div>
          ) : (
            <p className="text-sm text-success-600 font-medium">
              Bill fully paid.
            </p>
          )}
        </div>

        <div className="border-t px-5 py-3 flex justify-end gap-2">
          {balance > 0 && (
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-primary-600 hover:bg-primary-700"
            >
              {saving ? "Saving…" : "Record Payment"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
