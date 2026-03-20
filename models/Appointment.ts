import mongoose, { Schema, Document } from 'mongoose'

export interface IAppointment extends Document {
  tenantId: mongoose.Types.ObjectId
  patientId: mongoose.Types.ObjectId
  doctorId: mongoose.Types.ObjectId
  slotId?: mongoose.Types.ObjectId
  symptoms: string
  status: 'PENDING' | 'CONFIRMED' | 'ARRIVED' | 'CANCELLED' | 'COMPLETED'
  bookingRef: string
  tokenNumber?: number
  isWalkIn: boolean
  arrivedAt?: Date
  feesCollected: number
  reminder24hSent: boolean
  reminder1hSent: boolean
  createdAt: Date
}

const AppointmentSchema = new Schema<IAppointment>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true },
    slotId: { type: Schema.Types.ObjectId, ref: 'Slot' },
    symptoms: { type: String, default: '' },
    status: {
      type: String,
      enum: ['PENDING', 'CONFIRMED', 'ARRIVED', 'CANCELLED', 'COMPLETED'],
      default: 'PENDING',
    },
    bookingRef: { type: String, required: true, unique: true },
    tokenNumber: { type: Number },
    isWalkIn: { type: Boolean, default: false },
    arrivedAt: { type: Date },
    feesCollected: { type: Number, default: 0 },
    reminder24hSent: { type: Boolean, default: false },
    reminder1hSent: { type: Boolean, default: false },
  },
  { timestamps: true }
)

AppointmentSchema.index({ tenantId: 1, status: 1 })
AppointmentSchema.index({ tenantId: 1, doctorId: 1 })
AppointmentSchema.index({ tenantId: 1, patientId: 1 })

export default mongoose.models.Appointment || mongoose.model<IAppointment>('Appointment', AppointmentSchema)
