import mongoose, { Schema, Document } from 'mongoose'

export interface IPatient extends Document {
  tenantId: mongoose.Types.ObjectId
  whatsappNumber: string
  name: string
  age: number
  languagePref: 'hi' | 'en'
  createdAt: Date
}

const PatientSchema = new Schema<IPatient>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    whatsappNumber: { type: String, required: true },
    name: { type: String, required: true },
    age: { type: Number, default: 0 },
    languagePref: { type: String, enum: ['hi', 'en'], default: 'hi' },
  },
  { timestamps: true }
)

PatientSchema.index({ tenantId: 1, whatsappNumber: 1 }, { unique: true })

export default mongoose.models.Patient || mongoose.model<IPatient>('Patient', PatientSchema)
