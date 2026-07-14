"use client";

import { ScanLine } from "lucide-react";
import {
  EnterResultsDialog,
  type ResultData,
} from "@/components/common/EnterResultsDialog";
import { printRadiologyReport } from "./ResultsPrinter";
import type { PrintLetterheadConfig } from "@/lib/print/layouts";
import type { RadiologyBill } from "./types";

interface ResultTest {
  testId?: string;
  testName: string;
  findings: string;
  impression: string;
}

const ta =
  "w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus-visible:border-primary-400 focus-visible:ring-1 focus-visible:ring-primary-100 outline-none bg-white resize-none";

export function RadiologyResultsDialog({
  bill,
  clinicName,
  clinicAddress,
  clinicPhone,
  logoUrl,
  printLayouts,
  printShowLogo,
  printHeaderImages,
  printFooterContents,
  printLetterheads,
  onClose,
  onSaved,
}: {
  bill: RadiologyBill;
  clinicName: string;
  clinicAddress?: string;
  clinicPhone?: string;
  logoUrl?: string;
  printLayouts?: Record<string, string>;
  printShowLogo?: Record<string, boolean>;
  printHeaderImages?: Record<string, string>;
  printFooterContents?: Record<string, string>;
  printLetterheads?: Record<string, Partial<PrintLetterheadConfig>>;
  onClose: () => void;
  onSaved: (status: "pending" | "completed") => void;
}) {
  return (
    <EnterResultsDialog<ResultTest>
      billNo={bill.billNo}
      billDate={bill.billDate}
      patientName={bill.patientId?.name}
      itemCount={bill.items.length}
      resultsEndpoint={`/api/dashboard/radiology/bills/${bill._id}/results`}
      onClose={onClose}
      onSaved={onSaved}
      icon={ScanLine}
      iconClassName="w-4 h-4 text-purple-600"
      loaderClassName="w-6 h-6 animate-spin text-purple-400"
      testHeaderClassName="bg-purple-50 border-b border-purple-100 px-4 py-2"
      testTitleClassName="text-xs font-semibold text-purple-700"
      dialogMaxWidthClassName="max-w-3xl"
      reportedByPlaceholder="Radiographer name"
      verifiedByPlaceholder="Radiologist name"
      onPrint={(result: ResultData<ResultTest>) =>
        printRadiologyReport({
          billNo: bill.billNo,
          billDate: bill.billDate,
          reportDate: result.reportDate,
          patientName: bill.patientId?.name,
          uhid: bill.patientId?.uhid,
          referenceDoctor: bill.referenceDoctor,
          reportedByName: result.reportedByName,
          verifiedByName: result.verifiedByName,
          tests: result.tests,
          clinicName,
          clinicAddress,
          clinicPhone,
          logoUrl,
          printLayouts,
          printShowLogo,
          printHeaderImages,
          printFooterContents,
          printLetterheads,
        })
      }
      renderTest={(test, _idx, update, canWrite) => (
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-2xs font-semibold text-gray-500 uppercase mb-1.5">
              Findings
            </label>
            <textarea
              rows={4}
              value={test.findings}
              onChange={(e) => update({ findings: e.target.value })}
              disabled={!canWrite}
              placeholder="Describe the radiological findings…"
              className={ta}
            />
          </div>
          <div>
            <label className="block text-2xs font-semibold text-gray-500 uppercase mb-1.5">
              Impression / Conclusion
            </label>
            <textarea
              rows={3}
              value={test.impression}
              onChange={(e) => update({ impression: e.target.value })}
              disabled={!canWrite}
              placeholder="Clinical impression or diagnosis…"
              className={ta}
            />
          </div>
        </div>
      )}
    />
  );
}
