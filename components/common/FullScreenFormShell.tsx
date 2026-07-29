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
      <div className="flex flex-wrap items-center gap-3 bg-primary-600 px-3 py-2 shrink-0">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <h1 className="text-sm font-semibold text-white whitespace-nowrap shrink-0">
            {title}
          </h1>
          <button
            onClick={handleClose}
            className="ml-auto sm:hidden p-1.5 text-white/80 hover:text-white shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="w-full sm:w-80 sm:min-w-0">
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
          className="hidden sm:block ml-auto p-1.5 text-white/80 hover:text-white shrink-0"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-col md:flex-row flex-1 min-h-0 bg-gray-50 overflow-y-auto md:overflow-hidden">
        <div className="flex-1 md:overflow-y-auto p-4 sm:p-5 space-y-4 border-b md:border-b-0 md:border-r border-gray-200 bg-white">
          {left}
        </div>
        <div className="w-full md:w-2/5 md:shrink-0 md:overflow-y-auto p-4 sm:p-5 space-y-3 bg-gray-50">
          {right}
        </div>
      </div>

      {/* ── Bottom bar ── */}
      {footer && (
        <div className="flex flex-wrap items-center justify-end gap-3 bg-white border-t border-gray-200 px-4 py-2 shrink-0">
          {footer}
        </div>
      )}
    </div>
  );
}
