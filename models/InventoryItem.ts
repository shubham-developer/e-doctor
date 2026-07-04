import mongoose, { Schema, Document } from 'mongoose'

export interface IInventoryItem extends Document {
  tenantId: mongoose.Types.ObjectId
  name: string
  categoryId: mongoose.Types.ObjectId
  unit: string
  currentStock: number
  reorderLevel: number
  maxStock: number
  unitCost: number
  location: string
  description: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const InventoryItemSchema = new Schema<IInventoryItem>(
  {
    tenantId:     { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    name:         { type: String, required: true },
    categoryId:   { type: Schema.Types.ObjectId, ref: 'InventoryCategory', required: true },
    unit:         { type: String, default: 'Pcs' },
    currentStock: { type: Number, default: 0 },
    reorderLevel: { type: Number, default: 0 },
    maxStock:     { type: Number, default: 0 },
    unitCost:     { type: Number, default: 0 },
    location:     { type: String, default: '' },
    description:  { type: String, default: '' },
    isActive:     { type: Boolean, default: true },
  },
  { timestamps: true }
)

InventoryItemSchema.index({ tenantId: 1, name: 1 })
InventoryItemSchema.index({ tenantId: 1, categoryId: 1 })

if (process.env.NODE_ENV !== 'production' && mongoose.models.InventoryItem) {
  delete mongoose.models.InventoryItem
}

export default mongoose.models.InventoryItem ||
  mongoose.model<IInventoryItem>('InventoryItem', InventoryItemSchema)
