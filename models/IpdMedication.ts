import mongoose, { Schema, Document } from "mongoose";

export interface IIpdMedication extends Document {
  tenantId: mongoose.Types.ObjectId;
  ipdId: mongoose.Types.ObjectId;
  medicineId?: mongoose.Types.ObjectId;
  medicineName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  date: string;
  note?: string;
  addedByName?: string;
  chargeId?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const IpdMedicationSchema = new Schema<IIpdMedication>(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    ipdId: {
      type: Schema.Types.ObjectId,
      ref: "IpdAdmission",
      required: true,
      index: true,
    },
    medicineId: { type: Schema.Types.ObjectId, ref: "Medicine" },
    medicineName: { type: String, required: true },
    quantity: { type: Number, default: 1 },
    unitPrice: { type: Number, required: true },
    total: { type: Number, required: true },
    date: { type: String, required: true },
    note: { type: String },
    addedByName: { type: String },
    chargeId: { type: Schema.Types.ObjectId, ref: "IpdCharge" },
  },
  { timestamps: true },
);

if (process.env.NODE_ENV !== "production" && mongoose.models.IpdMedication) {
  delete (mongoose.models as Record<string, unknown>).IpdMedication;
}
export default mongoose.model<IIpdMedication>(
  "IpdMedication",
  IpdMedicationSchema,
);
