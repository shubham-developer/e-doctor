import mongoose, { Schema, Document } from 'mongoose'

export interface ITenant extends Document {
  name: string
  slug: string
  hospitalCode: string
  phone: string
  email: string
  whatsappNumber: string
  whatsappPhoneId: string
  whatsappAccessToken: string
  logoUrl: string
  smallLogoUrl: string
  brandColor: string
  language: string
  dateFormat: string
  timeZone: string
  currency: string
  currencySymbol: string
  creditLimit: number
  timeFormat: string
  plan: 'STARTER' | 'GROWTH' | 'PRO'
  planExpiresAt: Date
  isActive: boolean
  notifications: {
    reminder24h: boolean
    reminder1h: boolean
  }
  address: string
  city: string
  state: string
  pincode: string
  country: string
  createdAt: Date
}

const TenantSchema = new Schema<ITenant>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    whatsappNumber: { type: String, required: true },
    whatsappPhoneId: { type: String, default: '' },
    whatsappAccessToken: { type: String, default: '' },
    hospitalCode: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    logoUrl: { type: String, default: '' },
    smallLogoUrl: { type: String, default: '' },
    brandColor: { type: String, default: '#0ea5a0' },
    language: { type: String, default: 'English' },
    dateFormat: { type: String, default: 'MM/DD/YYYY' },
    timeZone: { type: String, default: '(GMT+05:30) Asia, Kolkata' },
    currency: { type: String, default: 'INR' },
    currencySymbol: { type: String, default: '₹' },
    creditLimit: { type: Number, default: 0 },
    timeFormat: { type: String, default: '12 Hour' },
    plan: { type: String, enum: ['STARTER', 'GROWTH', 'PRO'], default: 'STARTER' },
    planExpiresAt: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    isActive: { type: Boolean, default: true },
    notifications: {
      reminder24h: { type: Boolean, default: true },
      reminder1h: { type: Boolean, default: true },
    },
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    pincode: { type: String, default: '' },
    country: { type: String, default: 'India' },
  },
  { timestamps: true }
)

export default mongoose.models.Tenant || mongoose.model<ITenant>('Tenant', TenantSchema)
