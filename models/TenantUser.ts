import mongoose, { Schema, Document } from 'mongoose'

export interface ITenantUser extends Document {
  tenantId: mongoose.Types.ObjectId
  name: string
  email: string
  passwordHash: string
  role: 'OWNER' | 'RECEPTIONIST' | 'VIEWER'
  isActive: boolean
  createdAt: Date
}

const TenantUserSchema = new Schema<ITenantUser>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['OWNER', 'RECEPTIONIST', 'VIEWER'], default: 'RECEPTIONIST' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

TenantUserSchema.index({ email: 1, tenantId: 1 }, { unique: true })

export default mongoose.models.TenantUser || mongoose.model<ITenantUser>('TenantUser', TenantUserSchema)
