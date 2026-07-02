import mongoose, { Schema, Document } from 'mongoose'

export interface IChargeType extends Document {
  tenantId: mongoose.Types.ObjectId
  name: string
  applicableModules: string[]
  isActive: boolean
  sortOrder: number
  createdAt: Date
}

const ChargeTypeSchema = new Schema<IChargeType>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    name: { type: String, required: true },
    applicableModules: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
)

ChargeTypeSchema.index({ tenantId: 1, sortOrder: 1 })

export default mongoose.models.ChargeType ||
  mongoose.model<IChargeType>('ChargeType', ChargeTypeSchema)
