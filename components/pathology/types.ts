// Shared types for the Pathology billing module.

export interface PatientOption { id: string; name: string; code?: string }

export interface PathologyTest {
  _id: string
  name: string
  shortName: string
  reportDays: number
  standardCharge: number
  tax: number
  amount: number
}

export interface TestRow {
  testId: string
  testName: string
  reportDays: number
  reportDate: string
  tax: number
  charge: number
  amount: number
}

export interface BillItem {
  testId: string
  testName: string
  reportDate?: string
  charge: number
  tax: number
  amount: number
}

export interface PathologyBill {
  _id: string
  billNo: string
  billNumber: number
  patientId: { _id: string; name: string; patientCode?: string } | null
  billDate: string
  caseId?: string
  referenceDoctor?: string
  note?: string
  previousReportValue?: string
  paymentMode?: string
  items: BillItem[]
  amount: number
  discount: number
  tax: number
  netAmount: number
  paidAmount: number
  balance: number
  createdAt: string
  resultStatus?: "pending" | "completed"
}
