import mongoose, { Schema, Document } from "mongoose";

export interface IRadiologyResultTest {
  testId?: mongoose.Types.ObjectId;
  testName: string;
  findings?: string;
  impression?: string;
}

export interface IRadiologyResult extends Document {
  tenantId: mongoose.Types.ObjectId;
  billId: mongoose.Types.ObjectId;
  patientId?: mongoose.Types.ObjectId;
  billDate?: string;
  reportDate?: string;
  status: "pending" | "completed";
  reportedByName?: string;
  verifiedByName?: string;
  tests: IRadiologyResultTest[];
  createdAt: Date;
  updatedAt: Date;
}

const TestSchema = new Schema<IRadiologyResultTest>(
  {
    testId: { type: Schema.Types.ObjectId },
    testName: { type: String, required: true },
    findings: { type: String, default: "" },
    impression: { type: String, default: "" },
  },
  { _id: false },
);

const RadiologyResultSchema = new Schema<IRadiologyResult>(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    billId: {
      type: Schema.Types.ObjectId,
      ref: "RadiologyBill",
      required: true,
    },
    patientId: { type: Schema.Types.ObjectId, ref: "Patient" },
    billDate: { type: String },
    reportDate: { type: String },
    status: {
      type: String,
      enum: ["pending", "completed"],
      default: "pending",
    },
    reportedByName: { type: String },
    verifiedByName: { type: String },
    tests: [TestSchema],
  },
  { timestamps: true },
);

RadiologyResultSchema.index({ tenantId: 1, billId: 1 }, { unique: true });

if (process.env.NODE_ENV !== "production" && mongoose.models.RadiologyResult) {
  delete (mongoose.models as Record<string, unknown>).RadiologyResult;
}
export default mongoose.model<IRadiologyResult>(
  "RadiologyResult",
  RadiologyResultSchema,
);
