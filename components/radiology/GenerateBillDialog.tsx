"use client";

import { GenerateBillDialog as CommonGenerateBillDialog } from "@/components/common/GenerateBillDialog";
import { printRadiologyBillReceipt } from "@/components/radiology/RadiologyBillPrinter";
import type { PatientOption, RadiologyBill } from "@/components/radiology/types";

export function GenerateBillDialog(props: {
  onClose: () => void;
  onSaved: (b: RadiologyBill) => void;
  clinicName: string;
  clinicAddress?: string;
  clinicPhone?: string;
  logoUrl?: string;
  initialPatient?: PatientOption;
}) {
  return (
    <CommonGenerateBillDialog
      {...props}
      testsEndpoint="/api/dashboard/radiology/tests"
      testsQueryKey="radiology-tests"
      billsEndpoint="/api/dashboard/radiology/bills"
      printReceipt={printRadiologyBillReceipt}
    />
  );
}
