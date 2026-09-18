import mongoose, { Schema, Document } from "mongoose";

export interface IStaff extends Document {
  tenantId: mongoose.Types.ObjectId;
  staffCode: number;
  name: string;
  phone?: string;
  alternatePhone?: string;
  email?: string;
  role: string;
  customRoleId?: mongoose.Types.ObjectId;
  /** Linked TenantUser login account, if this staff member has one. */
  userId?: mongoose.Types.ObjectId;
  designation?: string;
  department?: string;
  floor?: string;
  address?: string;
  dateOfBirth?: string;
  dateOfJoining?: string;
  salary?: number;
  photoUrl?: string;
  status: "active" | "inactive";
  /** Branches this staff member works at; empty = all of the tenant's branches. */
  branchIds: mongoose.Types.ObjectId[];
  createdAt: Date;
}

const StaffSchema = new Schema<IStaff>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    staffCode: { type: Number, required: true },
    name: { type: String, required: true },
    phone: { type: String },
    alternatePhone: { type: String },
    email: { type: String },
    role: { type: String, required: true },
    customRoleId: { type: Schema.Types.ObjectId, ref: "Role" },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "TenantUser",
      unique: true,
      sparse: true,
    },
    designation: { type: String },
    department: { type: String },
    floor: { type: String },
    address: { type: String },
    dateOfBirth: { type: String },
    dateOfJoining: { type: String },
    salary: { type: Number },
    photoUrl: { type: String },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    branchIds: {
      type: [Schema.Types.ObjectId],
      ref: "Branch",
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Alias so OPD/Appointments populate('doctorId', 'name specialization') works
StaffSchema.virtual("specialization").get(function () {
  return this.designation ?? "";
});

StaffSchema.index({ tenantId: 1, staffCode: 1 }, { unique: true });
StaffSchema.index({ tenantId: 1, name: 1 });

if (process.env.NODE_ENV !== "production" && mongoose.models.Staff) {
  delete (mongoose.models as Record<string, unknown>).Staff;
}
export default mongoose.model<IStaff>("Staff", StaffSchema);
