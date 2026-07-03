import mongoose, { Schema, Document } from 'mongoose'

export interface IChargeCategory extends Document {
  tenantId: mongoose.Types.ObjectId
  chargeTypeId?: mongoose.Types.ObjectId
  name: string
  description?: string
  appliesTo: string[]
  isActive: boolean
  sortOrder: number
  createdAt: Date
}

const ChargeCategorySchema = new Schema<IChargeCategory>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    chargeTypeId: { type: Schema.Types.ObjectId, ref: 'ChargeType' },
    name: { type: String, required: true },
    description: { type: String },
    appliesTo: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
)

ChargeCategorySchema.index({ tenantId: 1, sortOrder: 1 })

// Hot-reload guard: force schema re-registration in dev so new fields take effect
if (process.env.NODE_ENV !== 'production' && mongoose.models.ChargeCategory) {
  delete (mongoose.models as Record<string, unknown>).ChargeCategory
}

export default mongoose.models.ChargeCategory ||
  mongoose.model<IChargeCategory>('ChargeCategory', ChargeCategorySchema)
