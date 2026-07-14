"use client";

import { FlaskConical } from "lucide-react";
import {
  EnterResultsDialog,
  type ResultData,
} from "@/components/common/EnterResultsDialog";
import { Input } from "@/components/ui/input";
import { printPathologyReport } from "./ResultsPrinter";
import type { PrintLetterheadConfig } from "@/lib/print/layouts";
import type { PathologyBill } from "./types";

interface Parameter {
  name: string;
  value: string;
  unit: string;
  referenceRange: string;
  flag: "H" | "L" | "N" | "";
}

interface ResultTest {
  testId?: string;
  testName: string;
  parameters: Parameter[];
  remarks: string;
}

// ── Flag auto-calculation from reference range ─────────────────────────────
function autoFlag(value: string, refRange: string): "H" | "L" | "N" | "" {
  const num = parseFloat(value);
  if (isNaN(num) || !refRange.trim()) return "";

  const rangeMatch = refRange.match(/^(\d+\.?\d*)\s*[-–]\s*(\d+\.?\d*)/);
  if (rangeMatch) {
    const lo = parseFloat(rangeMatch[1]);
    const hi = parseFloat(rangeMatch[2]);
    if (num < lo) return "L";
    if (num > hi) return "H";
    return "N";
  }
  const ltMatch = refRange.match(/^[<≤]\s*(\d+\.?\d*)/);
  if (ltMatch) return num >= parseFloat(ltMatch[1]) ? "H" : "N";

  const gtMatch = refRange.match(/^[>≥]\s*(\d+\.?\d*)/);
  if (gtMatch) return num <= parseFloat(gtMatch[1]) ? "L" : "N";

  return "N";
}

const remarksInp =
  "h-7 w-full px-2 text-xs border border-gray-200 rounded focus-visible:border-primary-400 outline-none bg-white";
const paramInp =
  "h-7 text-xs md:text-xs border border-gray-200 rounded px-2 w-full bg-white focus-visible:border-primary-400 focus-visible:ring-0";

export function PathologyResultsDialog({
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
  bill: PathologyBill;
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
      resultsEndpoint={`/api/dashboard/pathology/bills/${bill._id}/results`}
      onClose={onClose}
      onSaved={onSaved}
      icon={FlaskConical}
      iconClassName="w-4 h-4 text-primary-600"
      loaderClassName="w-6 h-6 animate-spin text-primary-400"
      testHeaderClassName="bg-primary-50 border-b border-primary-100 px-4 py-2"
      testTitleClassName="text-xs font-semibold text-primary-700"
      dialogMaxWidthClassName="max-w-4xl"
      reportedByPlaceholder="Technician name"
      verifiedByPlaceholder="Pathologist name"
      onPrint={(result: ResultData<ResultTest>) =>
        printPathologyReport({
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
      renderTest={(test, _idx, update, canWrite) => {
        function setParam(paramIdx: number, key: keyof Parameter, val: string) {
          const parameters = test.parameters.map((p, pi) => {
            if (pi !== paramIdx) return p;
            const updated = { ...p, [key]: val };
            if (key === "value") {
              updated.flag = autoFlag(val, p.referenceRange);
            }
            return updated;
          });
          update({ parameters });
        }

        return (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-140">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wide text-2xs w-48">
                      Parameter
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wide text-2xs w-28">
                      Value
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wide text-2xs w-24">
                      Unit
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wide text-2xs">
                      Reference Range
                    </th>
                    <th className="px-3 py-2 text-center font-semibold text-gray-500 uppercase tracking-wide text-2xs w-16">
                      Flag
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {test.parameters.map((param, pi) => (
                    <tr key={pi} className="hover:bg-gray-50">
                      <td className="px-3 py-1.5 font-medium text-gray-700">
                        {param.name}
                      </td>
                      <td className="px-3 py-1.5">
                        <Input
                          type="text"
                          value={param.value}
                          onChange={(e) =>
                            setParam(pi, "value", e.target.value)
                          }
                          disabled={!canWrite}
                          placeholder="—"
                          className={`${paramInp} ${
                            param.flag === "H"
                              ? "border-danger-300 bg-danger-50 text-danger-700"
                              : param.flag === "L"
                                ? "border-primary-300 bg-primary-50 text-primary-700"
                                : ""
                          }`}
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <Input
                          type="text"
                          value={param.unit}
                          onChange={(e) => setParam(pi, "unit", e.target.value)}
                          disabled={!canWrite}
                          placeholder="unit"
                          className={paramInp}
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <Input
                          type="text"
                          value={param.referenceRange}
                          onChange={(e) =>
                            setParam(pi, "referenceRange", e.target.value)
                          }
                          disabled={!canWrite}
                          placeholder="e.g. 70-140"
                          className={paramInp}
                        />
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        {param.flag ? (
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-2xs font-bold ${
                              param.flag === "H"
                                ? "bg-danger-100 text-danger-700"
                                : param.flag === "L"
                                  ? "bg-primary-100 text-primary-700"
                                  : "bg-success-100 text-success-700"
                            }`}
                          >
                            {param.flag}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-3 py-2 border-t border-gray-100 bg-gray-50">
              <Input
                type="text"
                value={test.remarks}
                onChange={(e) => update({ remarks: e.target.value })}
                disabled={!canWrite}
                placeholder="Remarks (optional)…"
                className={remarksInp}
              />
            </div>
          </>
        );
      }}
    />
  );
}
