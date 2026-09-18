import mongoose, { Schema, Document } from "mongoose";

export interface IBranch extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: Date;
}

const BranchSchema = new Schema<IBranch>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    name: { type: String, required: true },
    code: { type: String, required: true },
    address: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    pincode: { type: String, default: "" },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
);

BranchSchema.index({ tenantId: 1, code: 1 }, { unique: true });
BranchSchema.index({ tenantId: 1, name: 1 });

if (process.env.NODE_ENV !== "production" && mongoose.models.Branch) {
  delete (mongoose.models as Record<string, unknown>).Branch;
}

export default mongoose.models.Branch ||
  mongoose.model<IBranch>("Branch", BranchSchema);
