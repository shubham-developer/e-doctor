import mongoose, { Schema, Document } from "mongoose";

export interface IPathologyResultParameter {
  name: string;
  value: string;
  unit: string;
  referenceRange: string;
  flag: "H" | "L" | "N" | "";
}

export interface IPathologyResultTest {
  testId?: mongoose.Types.ObjectId;
  testName: string;
  parameters: IPathologyResultParameter[];
  remarks?: string;
}

export interface IPathologyResult extends Document {
  tenantId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  billId: mongoose.Types.ObjectId;
  patientId?: mongoose.Types.ObjectId;
  billDate?: string;
  reportDate?: string;
  status: "pending" | "completed";
  reportedByName?: string;
  verifiedByName?: string;
  tests: IPathologyResultTest[];
  createdAt: Date;
  updatedAt: Date;
}

const ParameterSchema = new Schema<IPathologyResultParameter>(
  {
    name: { type: String, required: true },
    value: { type: String, default: "" },
    unit: { type: String, default: "" },
    referenceRange: { type: String, default: "" },
    flag: { type: String, enum: ["H", "L", "N", ""], default: "" },
  },
  { _id: false },
);

const TestSchema = new Schema<IPathologyResultTest>(
  {
    testId: { type: Schema.Types.ObjectId },
    testName: { type: String, required: true },
    parameters: [ParameterSchema],
    remarks: { type: String },
  },
  { _id: false },
);

const PathologyResultSchema = new Schema<IPathologyResult>(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true },
    billId: {
      type: Schema.Types.ObjectId,
      ref: "PathologyBill",
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

PathologyResultSchema.index({ tenantId: 1, billId: 1 }, { unique: true });

if (process.env.NODE_ENV !== "production" && mongoose.models.PathologyResult) {
  delete (mongoose.models as Record<string, unknown>).PathologyResult;
}
export default mongoose.model<IPathologyResult>(
  "PathologyResult",
  PathologyResultSchema,
);
