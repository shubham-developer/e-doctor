"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Activity, Clock, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/apiClient";
import { AddNurseNoteDialog } from "./AddNurseNoteDialog";
import type { NurseNote, Patient } from "./types";

const VITAL_LABELS: {
  key: keyof NonNullable<NurseNote["vitalSigns"]>;
  format: (v: string | number) => string;
}[] = [
  { key: "bp", format: (v) => `BP: ${v}` },
  { key: "pulse", format: (v) => `Pulse: ${v} bpm` },
  { key: "temp", format: (v) => `Temp: ${v}°F` },
  { key: "weight", format: (v) => `Wt: ${v} kg` },
  { key: "o2Sat", format: (v) => `O₂: ${v}%` },
  { key: "respRate", format: (v) => `RR: ${v}/min` },
];

export function NurseNotesPanel({
  notes,
  patient,
  onChanged,
}: {
  notes: NurseNote[];
  patient: Patient | null;
  onChanged: () => void;
}) {
  const [addOpen, setAddOpen] = useState(false);

  async function handleDelete(noteId: string) {
    if (!confirm("Delete this note?")) return;
    const res = await apiClient.delete(`/api/dashboard/nurse-notes/${noteId}`);
    if (!res.success) {
      toast.error(res.error ?? "Failed to delete note");
      return;
    }
    onChanged();
  }

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-gray-500 font-medium">
          {notes.length} note{notes.length !== 1 ? "s" : ""}
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setAddOpen(true)}
          className="gap-1 text-xs text-primary-600 hover:text-primary-800"
        >
          <Plus className="w-3.5 h-3.5" /> Add Note
        </Button>
      </div>

      {notes.length === 0 ? (
        <div className="py-10 text-center">
          <Activity className="w-8 h-8 text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No nurse notes yet</p>
          <button
            onClick={() => setAddOpen(true)}
            className="text-xs text-primary-600 hover:underline mt-1"
          >
            Add the first note
          </button>
        </div>
      ) : (
        notes.map((n) => (
          <div
            key={n._id}
            className="border border-gray-200 rounded-lg p-3 bg-white"
          >
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div>
                <span className="text-xs font-semibold text-gray-700">
                  {n.addedByName}
                </span>
                <span className="text-2xs text-gray-400 ml-1.5">
                  {n.addedByRole}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="flex items-center gap-1 text-2xs text-gray-400">
                  <Clock className="w-3 h-3" />
                  {new Date(n.createdAt).toLocaleString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <button
                  onClick={() => handleDelete(n._id)}
                  className="p-0.5 rounded hover:bg-danger-50 text-gray-300 hover:text-danger-500"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
              {n.note}
            </p>
            {n.vitalSigns && (
              <div className="mt-2 flex flex-wrap gap-1.5 empty:hidden">
                {VITAL_LABELS.map(({ key, format }) => {
                  const value = n.vitalSigns?.[key];
                  if (!value) return null;
                  return (
                    <span
                      key={key}
                      className="text-2xs bg-primary-50 text-primary-700 px-1.5 py-0.5 rounded"
                    >
                      {format(value)}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        ))
      )}

      {addOpen && patient && (
        <AddNurseNoteDialog
          patient={patient}
          onClose={() => setAddOpen(false)}
          onSaved={onChanged}
        />
      )}
    </div>
  );
}
