"use client";

import { GenerateBillDialog as CommonGenerateBillDialog } from "@/components/common/GenerateBillDialog";
import { printPathologyBillReceipt } from "@/components/pathology/PathologyBillPrinter";
import type { PatientOption, PathologyBill } from "@/components/pathology/types";

export function GenerateBillDialog(props: {
  onClose: () => void;
  onSaved: (b: PathologyBill) => void;
  clinicName: string;
  clinicAddress?: string;
  clinicPhone?: string;
  logoUrl?: string;
  initialPatient?: PatientOption;
}) {
  return (
    <CommonGenerateBillDialog
      {...props}
      testsEndpoint="/api/dashboard/pathology/tests"
      testsQueryKey="pathology-tests"
      billsEndpoint="/api/dashboard/pathology/bills"
      printReceipt={printPathologyBillReceipt}
      extendedPatientBar
    />
  );
}
