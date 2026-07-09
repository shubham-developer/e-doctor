// Radiology-module aliases for the shared diagnostics types (radiology and
// pathology billing are structurally identical — see lib/types/diagnostics.ts).

export type {
  PatientOption,
  TestRow,
  BillItem,
  DiagnosticTest as RadiologyTest,
  DiagnosticBill as RadiologyBill,
} from "@/lib/types/diagnostics";
