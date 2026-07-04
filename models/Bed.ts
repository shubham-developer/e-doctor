import mongoose, { Schema, Document } from "mongoose";

export interface IBed extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  bedType: string;
  bedGroup: string;
  floor: string;
  status: "available" | "allotted";
  createdAt: Date;
}

const BedSchema = new Schema<IBed>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    name: { type: String, required: true },
    bedType: { type: String, default: "" },
    bedGroup: { type: String, default: "" },
    floor: { type: String, default: "" },
    status: {
      type: String,
      enum: ["available", "allotted"],
      default: "available",
    },
  },
  { timestamps: true },
);

BedSchema.index({ tenantId: 1, name: 1 }, { unique: true });
BedSchema.index({ tenantId: 1, bedGroup: 1 });

if (process.env.NODE_ENV !== "production" && mongoose.models.Bed) {
  delete (mongoose.models as Record<string, unknown>).Bed;
}
export default mongoose.model<IBed>("Bed", BedSchema);
