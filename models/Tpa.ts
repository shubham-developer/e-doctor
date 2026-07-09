import mongoose, { Schema, Document } from "mongoose";

export type TpaType = "PRIVATE" | "PSU" | "GOVT" | "SCHEME";

export interface ITpa extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  code: string;
  type: TpaType;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  empanelmentNo?: string;
  isActive: boolean;
  createdAt: Date;
}

const TpaSchema = new Schema<ITpa>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    name: { type: String, required: true },
    code: { type: String, required: true },
    type: {
      type: String,
      enum: ["PRIVATE", "PSU", "GOVT", "SCHEME"],
      default: "PRIVATE",
    },
    contactPerson: { type: String },
    phone: { type: String },
    email: { type: String },
    address: { type: String },
    empanelmentNo: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

TpaSchema.index({ tenantId: 1, code: 1 }, { unique: true });
TpaSchema.index({ tenantId: 1, name: 1 });

if (process.env.NODE_ENV !== "production" && mongoose.models.Tpa) {
  delete (mongoose.models as Record<string, unknown>).Tpa;
}
export default mongoose.model<ITpa>("Tpa", TpaSchema);
