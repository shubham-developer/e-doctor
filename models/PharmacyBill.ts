import mongoose, { Schema, Document } from "mongoose";

export interface IPharmacyBillLine {
  medicineId?: mongoose.Types.ObjectId;
  medicineName: string;
  category?: string;
  batchNo?: string;
  expiryDate?: string;
  quantity: number;
  salePrice: number;
  taxPercent: number;
  discountPercent: number;
  amount: number;
}

export interface IPharmacyPayment {
  amount: number;
  mode: string;
  note?: string;
  createdAt: Date;
  createdBy?: { userId: string; name: string };
}

export interface IPharmacyBill extends Document {
  tenantId: mongoose.Types.ObjectId;
  billNumber: number;
  caseId?: string;
  prescriptionNo?: string;
  patientId?: mongoose.Types.ObjectId;
  doctorId?: mongoose.Types.ObjectId;
  doctorName?: string;
  applyTpa: boolean;
  lines: IPharmacyBillLine[];
  totalAmount: number;
  discountAmount: number;
  taxAmount: number;
  netAmount: number;
  paymentMode: string;
  paidAmount: number;
  payments: IPharmacyPayment[];
  note?: string;
  createdBy?: { userId: string; name: string };
  createdAt: Date;
}

const PharmacyBillSchema = new Schema<IPharmacyBill>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    billNumber: { type: Number, required: true },
    caseId: { type: String },
    prescriptionNo: { type: String },
    patientId: { type: Schema.Types.ObjectId, ref: "Patient" },
    doctorId: { type: Schema.Types.ObjectId, ref: "Doctor" },
    doctorName: { type: String },
    applyTpa: { type: Boolean, default: false },
    lines: [
      {
        medicineId: { type: Schema.Types.ObjectId, ref: "Medicine" },
        medicineName: { type: String, required: true },
        category: { type: String },
        batchNo: { type: String },
        expiryDate: { type: String },
        quantity: { type: Number, required: true },
        salePrice: { type: Number, default: 0 },
        taxPercent: { type: Number, default: 0 },
        discountPercent: { type: Number, default: 0 },
        amount: { type: Number, default: 0 },
      },
    ],
    totalAmount: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    netAmount: { type: Number, default: 0 },
    paymentMode: { type: String, default: "Cash" },
    paidAmount: { type: Number, default: 0 },
    payments: [
      {
        amount: { type: Number, required: true },
        mode: { type: String, default: "Cash" },
        note: { type: String },
        createdAt: { type: Date, default: Date.now },
        createdBy: {
          userId: { type: String },
          name: { type: String },
        },
      },
    ],
    note: { type: String },
    createdBy: {
      userId: { type: String },
      name: { type: String },
    },
  },
  { timestamps: true },
);

PharmacyBillSchema.index({ tenantId: 1, billNumber: 1 });

if (process.env.NODE_ENV !== "production" && mongoose.models.PharmacyBill) {
  delete (mongoose.models as Record<string, unknown>).PharmacyBill;
}
export default mongoose.model<IPharmacyBill>(
  "PharmacyBill",
  PharmacyBillSchema,
);
