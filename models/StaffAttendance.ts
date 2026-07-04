import mongoose, { Schema, Document } from 'mongoose'

export interface IStaffAttendance extends Document {
  tenantId: mongoose.Types.ObjectId
  staffId: mongoose.Types.ObjectId
  staffName: string
  staffCode: number
  date: Date          // midnight UTC of the attendance day
  status: 'present' | 'absent' | 'half_day' | 'leave' | 'holiday'
  checkIn?: string    // "HH:MM"
  checkOut?: string   // "HH:MM"
  notes?: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

const StaffAttendanceSchema = new Schema<IStaffAttendance>(
  {
    tenantId:  { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    staffId:   { type: Schema.Types.ObjectId, ref: 'Staff', required: true },
    staffName: { type: String, required: true },
    staffCode: { type: Number, required: true },
    date:      { type: Date, required: true },
    status:    { type: String, enum: ['present', 'absent', 'half_day', 'leave', 'holiday'], default: 'present' },
    checkIn:   { type: String },
    checkOut:  { type: String },
    notes:     { type: String },
    createdBy: { type: String, default: '' },
  },
  { timestamps: true }
)

StaffAttendanceSchema.index({ tenantId: 1, date: 1 })
StaffAttendanceSchema.index({ tenantId: 1, staffId: 1, date: 1 }, { unique: true })

if (process.env.NODE_ENV !== 'production' && mongoose.models.StaffAttendance) {
  delete mongoose.models.StaffAttendance
}

export default mongoose.models.StaffAttendance ||
  mongoose.model<IStaffAttendance>('StaffAttendance', StaffAttendanceSchema)
