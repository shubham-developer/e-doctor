"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PAYMENT_MODES, type PaymentModalState } from "./types";

export function AddPaymentModal({
  payModal,
  fmt,
  onClose,
  onSubmit,
}: {
  payModal: PaymentModalState;
  fmt: (n: number) => string;
  onClose: () => void;
  onSubmit: (amount: number, mode: string) => Promise<void>;
}) {
  const [payAmt, setPayAmt] = useState("");
  const [payMode, setPayMode] = useState("Cash");
  const [paying, setPaying] = useState(false);

  const submit = async () => {
    const amt = Number(payAmt);
    if (!amt || amt <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (amt > payModal.balance) {
      toast.error("Amount exceeds balance");
      return;
    }
    setPaying(true);
    try {
      await onSubmit(amt, payMode);
    } finally {
      setPaying(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-medium text-gray-900 mb-1">
          Add Payment
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          {payModal.patientName} · Balance:{" "}
          <span className="font-semibold text-danger-600">
            {fmt(payModal.balance)}
          </span>
        </p>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">
              Amount
            </label>
            <Input
              type="number"
              min="0"
              step="0.01"
              max={payModal.balance}
              value={payAmt}
              onChange={(e) => setPayAmt(e.target.value)}
              placeholder={`Max ${fmt(payModal.balance)}`}
              className="h-8 text-sm"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">
              Payment Mode
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PAYMENT_MODES.map((m) => (
                <button
                  key={m}
                  onClick={() => setPayMode(m)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    payMode === m
                      ? "bg-primary-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <Button size="sm" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={submit}
            disabled={paying}
            className="bg-primary-600 hover:bg-primary-700 text-white"
          >
            {paying ? "Saving…" : "Record Payment"}
          </Button>
        </div>
      </div>
    </div>
  );
}
