"use client";

import { FormDialog } from "@/components/common/FormDialog";
import {
  PatientForm,
  type PatientFormData,
} from "@/components/patients/PatientForm";
import type { Patient } from "./types";

export function EditPatientDialog({
  patient,
  onClose,
  onSave,
}: {
  patient: Patient;
  onClose: () => void;
  onSave: (data: PatientFormData) => Promise<void>;
}) {
  return (
    <FormDialog
      open
      onClose={onClose}
      title="Edit Patient"
      contentClassName="sm:max-w-2xl"
    >
      <div className="px-5 py-4 max-h-[75vh] overflow-y-auto">
        <PatientForm
          initial={patient as unknown as Partial<PatientFormData>}
          onSave={onSave}
          onClose={onClose}
        />
      </div>
    </FormDialog>
  );
}
