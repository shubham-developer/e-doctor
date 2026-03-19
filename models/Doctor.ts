import mongoose, { Schema, Document } from 'mongoose'

export interface IDoctor extends Document {
  tenantId: mongoose.Types.ObjectId
  name: string
  specialization: string
  photoUrl: string
  languages: string[]
  consultationFee: number
  isActive: boolean
  createdAt: Date
}

const DoctorSchema = new Schema<IDoctor>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    name: { type: String, required: true },
    specialization: { type: String, required: true },
    photoUrl: { type: String, default: '' },
    languages: { type: [String], default: ['Hindi', 'English'] },
    consultationFee: { type: Number, required: true, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

DoctorSchema.index({ tenantId: 1 })

export default mongoose.models.Doctor || mongoose.model<IDoctor>('Doctor', DoctorSchema)
