import mongoose, { Schema, Document } from 'mongoose'

export interface ISlot extends Document {
  tenantId: mongoose.Types.ObjectId
  doctorId: mongoose.Types.ObjectId
  date: string // "YYYY-MM-DD"
  startTime: string // "HH:mm"
  endTime: string // "HH:mm"
  isBooked: boolean
  isBlocked: boolean
  createdAt: Date
}

const SlotSchema = new Schema<ISlot>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true },
    date: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    isBooked: { type: Boolean, default: false },
    isBlocked: { type: Boolean, default: false },
  },
  { timestamps: true }
)

SlotSchema.index({ tenantId: 1, doctorId: 1, date: 1 })

export default mongoose.models.Slot || mongoose.model<ISlot>('Slot', SlotSchema)
