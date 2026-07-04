import mongoose, { Schema, Document } from "mongoose";

export interface IPathologyBillItem {
  testId?: mongoose.Types.ObjectId;
  testName: string;
  reportDate?: string;
  charge: number;
  tax: number;
  amount: number;
}

export interface IPathologyBill extends Document {
  tenantId: mongoose.Types.ObjectId;
  billNo: string;
  billNumber: number;
  patientId?: mongoose.Types.ObjectId;
  caseId?: string;
  billDate: string;
  referenceDoctor?: string;
  previousReportValue?: string;
  note?: string;
  paymentMode?: string;
  items: IPathologyBillItem[];
  amount: number;
  discount: number;
  tax: number;
  netAmount: number;
  paidAmount: number;
  balance: number;
  createdBy?: { userId: string; name: string };
  createdAt: Date;
}

const PathologyBillSchema = new Schema<IPathologyBill>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    billNo: { type: String, required: true },
    billNumber: { type: Number, required: true },
    patientId: { type: Schema.Types.ObjectId, ref: "Patient" },
    caseId: { type: String },
    billDate: { type: String, required: true },
    referenceDoctor: { type: String },
    previousReportValue: { type: String },
    note: { type: String },
    paymentMode: { type: String, default: "Cash" },
    items: [
      {
        testId: { type: Schema.Types.ObjectId, ref: "PathologyTest" },
        testName: { type: String, required: true },
        reportDate: { type: String },
        charge: { type: Number, default: 0 },
        tax: { type: Number, default: 0 },
        amount: { type: Number, default: 0 },
      },
    ],
    amount: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    netAmount: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
    createdBy: {
      userId: { type: String },
      name: { type: String },
    },
  },
  { timestamps: true },
);

PathologyBillSchema.index({ tenantId: 1, billNumber: -1 });

if (process.env.NODE_ENV !== "production" && mongoose.models.PathologyBill) {
  delete (mongoose.models as Record<string, unknown>).PathologyBill;
}
export default mongoose.model<IPathologyBill>(
  "PathologyBill",
  PathologyBillSchema,
);
