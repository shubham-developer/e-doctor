export interface PatientOption {
  id: string
  name: string
  code?: string
  age?: number
  gender?: string
}

export interface Supplier {
  _id: string
  name: string
}

export interface Medicine {
  _id: string
  name: string
  category?: string
  company?: string
  composition?: string
  group?: string
  unit?: string
  minLevel?: number
  reorderLevel: number
  taxPercent: number
  boxPacking?: string
  vatAC?: string
  rackNumber?: string
  note?: string
  availableQty: number
  salePrice: number
  batchNo?: string
  expiryDate?: string
}

export interface PharmacyPayment {
  amount: number
  mode: string
  note?: string
  createdAt: string
  createdBy?: { name: string }
}

export interface BillLineRecord {
  medicineId?: string
  medicineName: string
  category?: string
  batchNo?: string
  expiryDate?: string
  quantity: number
  salePrice: number
  taxPercent: number
  discountPercent: number
  amount: number
}

export interface PharmacyBill {
  _id: string
  billNumber: number
  caseId?: string
  prescriptionNo?: string
  patientId?: { _id: string; name: string; uhid?: string }
  doctorId?: { _id: string; name: string }
  doctorName?: string
  lines: BillLineRecord[]
  totalAmount: number
  discountAmount: number
  taxAmount: number
  netAmount: number
  paidAmount: number
  payments: PharmacyPayment[]
  paymentMode: string
  note?: string
  createdBy?: { name: string }
  createdAt: string
}
