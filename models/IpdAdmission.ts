import mongoose, { Schema, Document } from 'mongoose'

export interface IBedHistoryEntry {
  bedGroup?: string
  bedNumber?: string
  fromDate: Date
  toDate?: Date
  isActive: boolean
}

export interface IIpdAdmission extends Document {
  tenantId: mongoose.Types.ObjectId
  patientId: mongoose.Types.ObjectId
  doctorId?: mongoose.Types.ObjectId
  ipdNumber: number
  admissionDate: string
  dischargeDate?: string
  status: 'ADMITTED' | 'DISCHARGED'
  // bed
  bedGroup?: string
  bedNumber?: string
  bedHistory: IBedHistoryEntry[]
  // clinical
  symptomsType?: string
  symptomsTitle?: string
  chiefComplaint?: string
  note?: string
  previousMedicalIssue?: string
  isAntenatal?: boolean
  // billing / meta
  tpa?: string
  creditLimit?: number
  casualty?: boolean
  isOldPatient?: boolean
  liveConsultation?: boolean
  caseNumber?: string
  reference?: string
  createdBy?: { userId: string; name: string }
  createdAt: Date
}

const IpdAdmissionSchema = new Schema<IIpdAdmission>(
  {
    tenantId:      { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    patientId:     { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctorId:      { type: Schema.Types.ObjectId, ref: 'Staff' },
    ipdNumber:     { type: Number, required: true },
    admissionDate: { type: String, required: true },
    dischargeDate: { type: String },
    status: { type: String, enum: ['ADMITTED', 'DISCHARGED'], default: 'ADMITTED' },
    // bed
    bedGroup:  { type: String },
    bedNumber: { type: String },
    bedHistory: [{
      bedGroup:  { type: String },
      bedNumber: { type: String },
      fromDate:  { type: Date, default: Date.now },
      toDate:    { type: Date },
      isActive:  { type: Boolean, default: true },
    }],
    // clinical
    symptomsType:  { type: String },
    symptomsTitle: { type: String },
    chiefComplaint: { type: String, default: '' },
    note:           { type: String },
    previousMedicalIssue: { type: String },
    isAntenatal: { type: Boolean, default: false },
    // billing / meta
    tpa:              { type: String },
    creditLimit:      { type: Number, default: 20000 },
    casualty:         { type: Boolean, default: false },
    isOldPatient:     { type: Boolean, default: false },
    liveConsultation: { type: Boolean, default: false },
    caseNumber: { type: String },
    reference:  { type: String },
    createdBy: {
      userId: { type: String },
      name:   { type: String },
    },
  },
  { timestamps: true }
)

IpdAdmissionSchema.index({ tenantId: 1, admissionDate: 1 })

if (process.env.NODE_ENV !== 'production' && mongoose.models.IpdAdmission) {
  delete (mongoose.models as Record<string, unknown>).IpdAdmission
}
export default mongoose.model<IIpdAdmission>('IpdAdmission', IpdAdmissionSchema)
