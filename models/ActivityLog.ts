import mongoose, { Schema, Document } from "mongoose";

export interface IActivityLog extends Document {
  tenantId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  userName: string;
  userRole: string;
  action: "login" | "logout" | "create" | "update" | "delete";
  module: string;
  description: string;
  link?: string;
  createdAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "TenantUser" },
    userName: { type: String, default: "" },
    userRole: { type: String, default: "" },
    action: { type: String, required: true },
    module: { type: String, required: true },
    description: { type: String, required: true },
    link: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

ActivityLogSchema.index({ tenantId: 1, createdAt: -1 });
ActivityLogSchema.index({ tenantId: 1, userId: 1, createdAt: -1 });

export default mongoose.models.ActivityLog ||
  mongoose.model<IActivityLog>("ActivityLog", ActivityLogSchema);
