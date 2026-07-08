// Shared types for the Radiology and Pathology billing modules — both are
// structurally identical (test-based billing with report dates), so they
// share one set of types instead of copy-pasting per module.

import type { PrintClinicInfo } from "@/lib/print/printDocument";

export interface PatientOption {
  id: string;
  name: string;
  code?: string;
  age?: number;
  gender?: string;
}

export interface DiagnosticTest {
  _id: string;
  name: string;
  shortName: string;
  reportDays: number;
  standardCharge: number;
  tax: number;
  amount: number;
}

export interface TestRow {
  testId: string;
  testName: string;
  reportDays: number;
  reportDate: string;
  tax: number;
  charge: number;
  amount: number;
}

export interface BillItem {
  testId: string;
  testName: string;
  reportDate?: string;
  charge: number;
  tax: number;
  amount: number;
}

export interface DiagnosticBill {
  _id: string;
  billNo: string;
  billNumber: number;
  patientId: { _id: string; name: string; uhid?: string } | null;
  billDate: string;
  caseId?: string;
  referenceDoctor?: string;
  note?: string;
  previousReportValue?: string;
  paymentMode?: string;
  items: BillItem[];
  amount: number;
  discount: number;
  tax: number;
  netAmount: number;
  paidAmount: number;
  balance: number;
  createdAt?: string;
  resultStatus?: "pending" | "completed";
}

export interface BillReceiptData extends PrintClinicInfo {
  billNo: string;
  billDate: string;
  caseId?: string;
  patientName?: string;
  uhid?: string;
  referenceDoctor?: string;
  note?: string;
  previousReportValue?: string;
  items: {
    testName: string;
    reportDate?: string;
    charge: number;
    tax: number;
    amount: number;
  }[];
  totalAmount: number;
  discountAmount: number;
  taxAmount: number;
  netAmount: number;
  paidAmount: number;
  balance: number;
  paymentMode?: string;
  currencySymbol?: string;
}
