import mongoose, { Schema, Document } from 'mongoose'

export interface ISupplier extends Document {
  tenantId: mongoose.Types.ObjectId
  name: string
  contact: string
  contactPersonName: string
  contactPersonPhone: string
  drugLicenseNumber: string
  address: string
  createdAt: Date
}

const SupplierSchema = new Schema<ISupplier>(
  {
    tenantId:          { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    name:              { type: String, required: true },
    contact:           { type: String, default: '' },
    contactPersonName: { type: String, default: '' },
    contactPersonPhone:{ type: String, default: '' },
    drugLicenseNumber: { type: String, default: '' },
    address:           { type: String, default: '' },
  },
  { timestamps: true }
)

SupplierSchema.index({ tenantId: 1, name: 1 })

export default mongoose.models.Supplier || mongoose.model<ISupplier>('Supplier', SupplierSchema)
