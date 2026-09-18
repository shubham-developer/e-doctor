"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Activity, User } from "lucide-react";
import { FormDialog } from "@/components/common/FormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "@/lib/apiClient";
import type { NurseNote } from "./types";

const VITAL_FIELDS = [
  { key: "bp", label: "BP", placeholder: "120/80" },
  { key: "pulse", label: "Pulse (bpm)", placeholder: "72" },
  { key: "temp", label: "Temp (°F)", placeholder: "98.6" },
  { key: "weight", label: "Weight (kg)", placeholder: "70" },
  { key: "o2Sat", label: "O₂ Sat (%)", placeholder: "99" },
  { key: "respRate", label: "RR (/min)", placeholder: "16" },
];

export function AddNurseNoteDialog({
  patient,
  onClose,
  onSaved,
}: {
  patient: { _id: string; name: string; uhid?: number };
  onClose: () => void;
  onSaved: (note: NurseNote) => void;
}) {
  const [note, setNote] = useState("");
  const [showVitals, setShowVitals] = useState(false);
  const [vitals, setVitals] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function setVital(k: string, v: string) {
    setVitals((prev) => ({ ...prev, [k]: v }));
  }

  async function handleSave() {
    if (!note.trim()) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = { patientId: patient._id, note };
      const filled: Record<string, unknown> = {};
      if (vitals.bp) filled.bp = vitals.bp;
      if (vitals.pulse) filled.pulse = Number(vitals.pulse);
      if (vitals.temp) filled.temp = Number(vitals.temp);
      if (vitals.weight) filled.weight = Number(vitals.weight);
      if (vitals.o2Sat) filled.o2Sat = Number(vitals.o2Sat);
      if (vitals.respRate) filled.respRate = Number(vitals.respRate);
      if (Object.keys(filled).length) body.vitalSigns = filled;

      const res = await apiClient.post<NurseNote>(
        "/api/dashboard/nurse-notes",
        body,
      );
      if (!res.success) {
        toast.error(res.error ?? "Failed to save note");
        return;
      }
      onSaved(res.data);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormDialog
      open
      onClose={onClose}
      title="Add Nurse Note"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !note.trim()}
            className="bg-primary-600 hover:bg-primary-700"
          >
            {saving ? "Saving…" : "Save Note"}
          </Button>
        </>
      }
    >
      <div className="px-5 py-4 space-y-3">
        <div className="flex items-center gap-2 bg-primary-50 border border-primary-100 rounded-lg px-3 py-2">
          <User className="w-4 h-4 text-primary-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-gray-800">
              {patient.name}
            </p>
            {patient.uhid && (
              <p className="text-2xs text-gray-400">UHID: {patient.uhid}</p>
            )}
          </div>
        </div>

        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Enter clinical observation, instructions, or follow-up notes…"
          rows={4}
          className="resize-none"
        />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowVitals((v) => !v)}
          className="gap-1.5 text-xs text-primary-600 hover:text-primary-800 px-0"
        >
          <Activity className="w-3.5 h-3.5" />
          {showVitals ? "Hide" : "Add"} Vital Signs (optional)
        </Button>

        {showVitals && (
          <div className="grid grid-cols-3 gap-2">
            {VITAL_FIELDS.map((f) => (
              <div key={f.key}>
                <Label className="text-2xs text-gray-500 mb-0.5">
                  {f.label}
                </Label>
                <Input
                  value={vitals[f.key] ?? ""}
                  onChange={(e) => setVital(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  className="h-8 text-xs"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </FormDialog>
  );
}
