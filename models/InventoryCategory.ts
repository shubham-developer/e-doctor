import mongoose, { Schema, Document } from 'mongoose'

export interface IInventoryCategory extends Document {
  tenantId: mongoose.Types.ObjectId
  name: string
  description: string
  createdAt: Date
  updatedAt: Date
}

const InventoryCategorySchema = new Schema<IInventoryCategory>(
  {
    tenantId:    { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    name:        { type: String, required: true },
    description: { type: String, default: '' },
  },
  { timestamps: true }
)

InventoryCategorySchema.index({ tenantId: 1, name: 1 })

if (process.env.NODE_ENV !== 'production' && mongoose.models.InventoryCategory) {
  delete mongoose.models.InventoryCategory
}

export default mongoose.models.InventoryCategory ||
  mongoose.model<IInventoryCategory>('InventoryCategory', InventoryCategorySchema)
