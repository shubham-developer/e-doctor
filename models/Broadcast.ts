import mongoose, { Schema, Document } from 'mongoose'

export interface IBroadcast extends Document {
  tenantId: mongoose.Types.ObjectId
  message: string
  language: 'hi' | 'en'
  target: string
  sentCount: number
  failedCount: number
  scheduledAt: Date | null
  sentAt: Date | null
  status: 'DRAFT' | 'SCHEDULED' | 'SENT' | 'FAILED'
  createdAt: Date
}

const BroadcastSchema = new Schema<IBroadcast>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    message: { type: String, required: true },
    language: { type: String, enum: ['hi', 'en'], default: 'hi' },
    target: { type: String, default: 'ALL' },
    sentCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    scheduledAt: { type: Date, default: null },
    sentAt: { type: Date, default: null },
    status: { type: String, enum: ['DRAFT', 'SCHEDULED', 'SENT', 'FAILED'], default: 'DRAFT' },
  },
  { timestamps: true }
)

BroadcastSchema.index({ tenantId: 1 })

export default mongoose.models.Broadcast || mongoose.model<IBroadcast>('Broadcast', BroadcastSchema)
