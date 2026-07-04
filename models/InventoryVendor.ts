import mongoose, { Schema, Document } from 'mongoose'

export interface IInventoryVendor extends Document {
  tenantId: mongoose.Types.ObjectId
  name: string
  contactPerson: string
  phone: string
  email: string
  address: string
  gstin: string
  createdAt: Date
  updatedAt: Date
}

const InventoryVendorSchema = new Schema<IInventoryVendor>(
  {
    tenantId:      { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    name:          { type: String, required: true },
    contactPerson: { type: String, default: '' },
    phone:         { type: String, default: '' },
    email:         { type: String, default: '' },
    address:       { type: String, default: '' },
    gstin:         { type: String, default: '' },
  },
  { timestamps: true }
)

InventoryVendorSchema.index({ tenantId: 1, name: 1 })

if (process.env.NODE_ENV !== 'production' && mongoose.models.InventoryVendor) {
  delete mongoose.models.InventoryVendor
}

export default mongoose.models.InventoryVendor ||
  mongoose.model<IInventoryVendor>('InventoryVendor', InventoryVendorSchema)
