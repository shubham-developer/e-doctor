import mongoose, { Schema, Document } from 'mongoose'

export interface ITaxCategory extends Document {
  tenantId: mongoose.Types.ObjectId
  name: string
  percent: number
  description?: string
  isActive: boolean
  sortOrder: number
  createdAt: Date
}

const TaxCategorySchema = new Schema<ITaxCategory>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    name: { type: String, required: true },
    percent: { type: Number, default: 0 },
    description: { type: String },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
)

TaxCategorySchema.index({ tenantId: 1, sortOrder: 1 })

export default mongoose.models.TaxCategory ||
  mongoose.model<ITaxCategory>('TaxCategory', TaxCategorySchema)
