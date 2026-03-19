import mongoose, { Schema, Document } from 'mongoose'

export interface ITenant extends Document {
  name: string
  slug: string
  whatsappNumber: string
  whatsappPhoneId: string
  whatsappAccessToken: string
  logoUrl: string
  brandColor: string
  plan: 'STARTER' | 'GROWTH' | 'PRO'
  planExpiresAt: Date
  isActive: boolean
  notifications: {
    reminder24h: boolean
    reminder1h: boolean
  }
  address: string
  createdAt: Date
}

const TenantSchema = new Schema<ITenant>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    whatsappNumber: { type: String, required: true },
    whatsappPhoneId: { type: String, default: '' },
    whatsappAccessToken: { type: String, default: '' },
    logoUrl: { type: String, default: '' },
    brandColor: { type: String, default: '#0ea5a0' },
    plan: { type: String, enum: ['STARTER', 'GROWTH', 'PRO'], default: 'STARTER' },
    planExpiresAt: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    isActive: { type: Boolean, default: true },
    notifications: {
      reminder24h: { type: Boolean, default: true },
      reminder1h: { type: Boolean, default: true },
    },
    address: { type: String, default: '' },
  },
  { timestamps: true }
)

export default mongoose.models.Tenant || mongoose.model<ITenant>('Tenant', TenantSchema)
