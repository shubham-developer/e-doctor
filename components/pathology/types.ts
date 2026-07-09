// Pathology-module aliases for the shared diagnostics types (radiology and
// pathology billing are structurally identical — see lib/types/diagnostics.ts).

export type {
  PatientOption,
  TestRow,
  BillItem,
  DiagnosticTest as PathologyTest,
  DiagnosticBill as PathologyBill,
} from "@/lib/types/diagnostics";
