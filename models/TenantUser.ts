import mongoose, { Schema, Document } from "mongoose";

export interface ITenantUser extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: "OWNER" | "RECEPTIONIST" | "VIEWER";
  customRoleId?: mongoose.Types.ObjectId;
  avatarUrl?: string;
  isActive: boolean;
  /** Branches this login may access; empty = all of the tenant's branches. */
  branchIds: mongoose.Types.ObjectId[];
  /** Branch selected as active immediately after login, if set. */
  defaultBranchId?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const TenantUserSchema = new Schema<ITenantUser>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["OWNER", "RECEPTIONIST", "VIEWER"],
      default: "RECEPTIONIST",
    },
    customRoleId: { type: Schema.Types.ObjectId, ref: "Role" },
    avatarUrl: { type: String },
    isActive: { type: Boolean, default: true },
    branchIds: {
      type: [Schema.Types.ObjectId],
      ref: "Branch",
      default: [],
    },
    defaultBranchId: { type: Schema.Types.ObjectId, ref: "Branch" },
  },
  { timestamps: true },
);

TenantUserSchema.index({ email: 1, tenantId: 1 }, { unique: true });

export default mongoose.models.TenantUser ||
  mongoose.model<ITenantUser>("TenantUser", TenantUserSchema);
