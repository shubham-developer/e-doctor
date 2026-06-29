import mongoose, { Schema, Document } from 'mongoose'

export interface IChargeCategory extends Document {
  tenantId: mongoose.Types.ObjectId
  name: string
  defaultFee: number
  isActive: boolean
  sortOrder: number
  createdAt: Date
}

const ChargeCategorySchema = new Schema<IChargeCategory>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    name: { type: String, required: true },
    defaultFee: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
)

ChargeCategorySchema.index({ tenantId: 1, sortOrder: 1 })

export default mongoose.models.ChargeCategory ||
  mongoose.model<IChargeCategory>('ChargeCategory', ChargeCategorySchema)
