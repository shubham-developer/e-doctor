"use client";

import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PatientCombobox } from "@/components/common/PatientCombobox";
import type { PatientOption } from "@/lib/types/patient";

/**
 * Full-screen "Add Visit"/"Add Admission" shell shared by OPD and IPD:
 * a blue top bar with title + patient picker, a left/right split body, and
 * an optional bottom action bar.
 */
export function FullScreenFormShell({
  title,
  patient,
  onPatientChange,
  onAddPatient,
  onClose,
  isDirty,
  left,
  right,
  footer,
}: {
  title: string;
  patient: PatientOption | null;
  onPatientChange: (p: PatientOption) => void;
  onAddPatient: () => void;
  onClose: () => void;
  /** When true, closing prompts the user to confirm discarding unsaved changes. */
  isDirty?: boolean;
  left: React.ReactNode;
  right: React.ReactNode;
  footer?: React.ReactNode;
}) {
  function handleClose() {
    if (isDirty && !confirm("Discard this form? Your changes will be lost.")) {
      return;
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col overflow-hidden">
      {/* ── Top bar: title + patient select ── */}
      <div className="h-12 bg-primary-600 flex items-center gap-3 px-3 shrink-0">
        <h1 className="text-sm font-semibold text-white whitespace-nowrap shrink-0">
          {title}
        </h1>
        <div className="w-80 min-w-0">
          <PatientCombobox value={patient} onChange={onPatientChange} />
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-9 gap-1.5 text-xs bg-white/10 border-white/30 text-white hover:bg-white/20 shrink-0"
          onClick={onAddPatient}
        >
          <Plus className="w-3.5 h-3.5" /> New Patient
        </Button>
        <button
          onClick={handleClose}
          className="ml-auto p-1.5 text-white/80 hover:text-white shrink-0"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 min-h-0 bg-gray-50">
        <div className="flex-1 overflow-y-auto p-5 space-y-4 border-r border-gray-200 bg-white">
          {left}
        </div>
        <div className="w-2/5 shrink-0 overflow-y-auto p-5 space-y-3 bg-gray-50">
          {right}
        </div>
      </div>

      {/* ── Bottom bar ── */}
      {footer && (
        <div className="h-12 bg-white border-t border-gray-200 flex items-center justify-end gap-3 px-4 shrink-0">
          {footer}
        </div>
      )}
    </div>
  );
}
