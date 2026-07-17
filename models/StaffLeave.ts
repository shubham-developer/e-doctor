import mongoose, { Schema, Document } from 'mongoose'

export type LeaveType = 'casual' | 'sick' | 'earned' | 'without_pay' | 'other'
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

export interface IStaffLeave extends Document {
  tenantId: mongoose.Types.ObjectId
  branchId: mongoose.Types.ObjectId
  staffId: mongoose.Types.ObjectId
  staffName: string
  staffCode: number
  department: string
  leaveType: LeaveType
  fromDate: Date
  toDate: Date
  days: number
  reason: string
  status: LeaveStatus
  approvedBy?: string
  approvedAt?: Date
  rejectedReason?: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

const StaffLeaveSchema = new Schema<IStaffLeave>(
  {
    tenantId:       { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    branchId:       { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    staffId:        { type: Schema.Types.ObjectId, ref: 'Staff', required: true },
    staffName:      { type: String, required: true },
    staffCode:      { type: Number, required: true },
    department:     { type: String, default: '' },
    leaveType:      { type: String, enum: ['casual', 'sick', 'earned', 'without_pay', 'other'], required: true },
    fromDate:       { type: Date, required: true },
    toDate:         { type: Date, required: true },
    days:           { type: Number, required: true },
    reason:         { type: String, default: '' },
    status:         { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled'], default: 'pending' },
    approvedBy:     { type: String },
    approvedAt:     { type: Date },
    rejectedReason: { type: String },
    createdBy:      { type: String, default: '' },
  },
  { timestamps: true }
)

StaffLeaveSchema.index({ tenantId: 1, status: 1 })
StaffLeaveSchema.index({ tenantId: 1, staffId: 1 })
StaffLeaveSchema.index({ tenantId: 1, fromDate: 1, toDate: 1 })

if (process.env.NODE_ENV !== 'production' && mongoose.models.StaffLeave) {
  delete mongoose.models.StaffLeave
}

export default mongoose.models.StaffLeave ||
  mongoose.model<IStaffLeave>('StaffLeave', StaffLeaveSchema)
