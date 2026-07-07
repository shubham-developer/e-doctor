import mongoose, { Schema, Document } from "mongoose";

export interface IIpdCharge extends Document {
  tenantId: mongoose.Types.ObjectId;
  ipdId: mongoose.Types.ObjectId;
  categoryName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  date: string;
  note?: string;
  addedByName?: string;
  isBedCharge?: boolean;
  chargeDate?: string; // YYYY-MM-DD — used to dedup auto bed charges per day
  createdAt: Date;
}

const IpdChargeSchema = new Schema<IIpdCharge>(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    ipdId: {
      type: Schema.Types.ObjectId,
      ref: "IpdAdmission",
      required: true,
      index: true,
    },
    categoryName: { type: String, required: true },
    quantity: { type: Number, default: 1 },
    unitPrice: { type: Number, required: true },
    total: { type: Number, required: true },
    date: { type: String, required: true },
    note: { type: String },
    addedByName: { type: String },
    isBedCharge: { type: Boolean, default: false },
    chargeDate: { type: String },
  },
  { timestamps: true },
);

if (process.env.NODE_ENV !== "production" && mongoose.models.IpdCharge) {
  delete (mongoose.models as Record<string, unknown>).IpdCharge;
}
export default mongoose.model<IIpdCharge>("IpdCharge", IpdChargeSchema);
