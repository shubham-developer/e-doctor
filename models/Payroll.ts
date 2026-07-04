import mongoose, { Schema, Document } from 'mongoose'

export interface PayrollAllowances {
  hra: number
  da: number
  medical: number
  transport: number
  other: number
}

export interface PayrollDeductions {
  pf: number
  esi: number
  tds: number
  advance: number
  other: number
}

export interface IPayroll extends Document {
  tenantId: mongoose.Types.ObjectId
  staffId: mongoose.Types.ObjectId
  staffName: string
  staffCode: number
  role: string
  department: string
  month: string // "YYYY-MM"
  basicSalary: number
  allowances: PayrollAllowances
  deductions: PayrollDeductions
  workingDays: number
  presentDays: number
  absentDays: number
  leaveDays: number
  halfDays: number
  grossSalary: number
  totalDeductions: number
  netSalary: number
  paymentStatus: 'pending' | 'paid'
  paymentDate?: Date
  paymentMode?: 'cash' | 'bank_transfer' | 'cheque' | 'upi'
  paymentRef?: string
  notes?: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

const AllowancesSchema = new Schema<PayrollAllowances>(
  { hra: { type: Number, default: 0 }, da: { type: Number, default: 0 }, medical: { type: Number, default: 0 }, transport: { type: Number, default: 0 }, other: { type: Number, default: 0 } },
  { _id: false }
)

const DeductionsSchema = new Schema<PayrollDeductions>(
  { pf: { type: Number, default: 0 }, esi: { type: Number, default: 0 }, tds: { type: Number, default: 0 }, advance: { type: Number, default: 0 }, other: { type: Number, default: 0 } },
  { _id: false }
)

const PayrollSchema = new Schema<IPayroll>(
  {
    tenantId:       { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    staffId:        { type: Schema.Types.ObjectId, ref: 'Staff', required: true },
    staffName:      { type: String, required: true },
    staffCode:      { type: Number, required: true },
    role:           { type: String, default: '' },
    department:     { type: String, default: '' },
    month:          { type: String, required: true }, // "YYYY-MM"
    basicSalary:    { type: Number, default: 0 },
    allowances:     { type: AllowancesSchema, default: () => ({}) },
    deductions:     { type: DeductionsSchema, default: () => ({}) },
    workingDays:    { type: Number, default: 26 },
    presentDays:    { type: Number, default: 26 },
    absentDays:     { type: Number, default: 0 },
    leaveDays:      { type: Number, default: 0 },
    halfDays:       { type: Number, default: 0 },
    grossSalary:    { type: Number, default: 0 },
    totalDeductions:{ type: Number, default: 0 },
    netSalary:      { type: Number, default: 0 },
    paymentStatus:  { type: String, enum: ['pending', 'paid'], default: 'pending' },
    paymentDate:    { type: Date },
    paymentMode:    { type: String, enum: ['cash', 'bank_transfer', 'cheque', 'upi'] },
    paymentRef:     { type: String },
    notes:          { type: String },
    createdBy:      { type: String, default: '' },
  },
  { timestamps: true }
)

PayrollSchema.index({ tenantId: 1, month: 1 })
PayrollSchema.index({ tenantId: 1, staffId: 1, month: 1 }, { unique: true })

if (process.env.NODE_ENV !== 'production' && mongoose.models.Payroll) {
  delete mongoose.models.Payroll
}

export default mongoose.models.Payroll || mongoose.model<IPayroll>('Payroll', PayrollSchema)
