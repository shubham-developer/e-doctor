import mongoose, { Schema, Document } from 'mongoose'

export interface ICharge extends Document {
  tenantId: mongoose.Types.ObjectId
  name: string
  chargeCategoryId?: mongoose.Types.ObjectId
  unitTypeId?: mongoose.Types.ObjectId
  taxCategoryId?: mongoose.Types.ObjectId
  standardCharge: number
  isActive: boolean
  sortOrder: number
  createdAt: Date
}

const ChargeSchema = new Schema<ICharge>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    name: { type: String, required: true },
    chargeCategoryId: { type: Schema.Types.ObjectId, ref: 'ChargeCategory' },
    unitTypeId: { type: Schema.Types.ObjectId, ref: 'UnitType' },
    taxCategoryId: { type: Schema.Types.ObjectId, ref: 'TaxCategory' },
    standardCharge: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
)

ChargeSchema.index({ tenantId: 1, sortOrder: 1 })

export default mongoose.models.Charge ||
  mongoose.model<ICharge>('Charge', ChargeSchema)
