import mongoose, { Schema, Document } from "mongoose";

export interface IRadiologyTest extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  shortName: string;
  testType?: string;
  chargeId?: mongoose.Types.ObjectId;
  method?: string;
  reportDays: number;
  tax: number;
  standardCharge: number;
  amount: number;
  createdAt: Date;
}

const RadiologyTestSchema = new Schema<IRadiologyTest>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    name: { type: String, required: true },
    shortName: { type: String },
    testType: { type: String },
    chargeId: { type: Schema.Types.ObjectId, ref: "Charge" },
    method: { type: String },
    reportDays: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    standardCharge: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

RadiologyTestSchema.index({ tenantId: 1 });

if (process.env.NODE_ENV !== "production" && mongoose.models.RadiologyTest) {
  delete (mongoose.models as Record<string, unknown>).RadiologyTest;
}
export default mongoose.model<IRadiologyTest>(
  "RadiologyTest",
  RadiologyTestSchema,
);
