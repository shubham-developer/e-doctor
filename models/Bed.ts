import mongoose, { Schema, Document } from "mongoose";

export interface IBed extends Document {
  tenantId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  name: string;
  bedType: string;
  bedGroup: string;
  floor: string;
  dailyCharge: number;
  status: "available" | "allotted";
  createdAt: Date;
}

const BedSchema = new Schema<IBed>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true },
    name: { type: String, required: true },
    bedType: { type: String, default: "" },
    bedGroup: { type: String, default: "" },
    floor: { type: String, default: "" },
    dailyCharge: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["available", "allotted"],
      default: "available",
    },
  },
  { timestamps: true },
);

BedSchema.index({ tenantId: 1, branchId: 1, name: 1 }, { unique: true });
BedSchema.index({ tenantId: 1, branchId: 1, bedGroup: 1 });

if (process.env.NODE_ENV !== "production" && mongoose.models.Bed) {
  delete (mongoose.models as Record<string, unknown>).Bed;
}
export default mongoose.model<IBed>("Bed", BedSchema);
