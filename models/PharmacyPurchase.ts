import mongoose, { Schema, Document } from "mongoose";

export interface IPharmacyPurchaseLine {
  medicineId?: mongoose.Types.ObjectId;
  medicineName: string;
  category?: string;
  batchNo: string;
  expiryMonth: string;
  mrp: number;
  batchAmount: number;
  salePrice: number;
  packingQty: number;
  quantity: number;
  purchasePrice: number;
  taxPercent: number;
  amount: number;
}

export interface IPharmacyPurchase extends Document {
  tenantId: mongoose.Types.ObjectId;
  purchaseNo: number;
  billNo?: string;
  purchaseDate: Date;
  supplierId: mongoose.Types.ObjectId;
  supplierName: string;
  lines: IPharmacyPurchaseLine[];
  note?: string;
  totalAmount: number;
  discountPercent: number;
  discountAmount: number;
  taxAmount: number;
  netAmount: number;
  paymentMode: string;
  paymentAmount: number;
  paymentNote?: string;
  createdBy?: { userId: string; name: string };
  createdAt: Date;
}

const PharmacyPurchaseSchema = new Schema<IPharmacyPurchase>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    purchaseNo: { type: Number, required: true },
    billNo: { type: String },
    purchaseDate: { type: Date, required: true },
    supplierId: {
      type: Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
    },
    supplierName: { type: String, required: true },
    lines: [
      {
        medicineId: { type: Schema.Types.ObjectId, ref: "Medicine" },
        medicineName: { type: String, required: true },
        category: { type: String },
        batchNo: { type: String, required: true },
        expiryMonth: { type: String, required: true },
        mrp: { type: Number, default: 0 },
        batchAmount: { type: Number, default: 0 },
        salePrice: { type: Number, default: 0 },
        packingQty: { type: Number, default: 0 },
        quantity: { type: Number, required: true },
        purchasePrice: { type: Number, default: 0 },
        taxPercent: { type: Number, default: 0 },
        amount: { type: Number, default: 0 },
      },
    ],
    note: { type: String },
    totalAmount: { type: Number, default: 0 },
    discountPercent: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    netAmount: { type: Number, default: 0 },
    paymentMode: { type: String, default: "" },
    paymentAmount: { type: Number, default: 0 },
    paymentNote: { type: String },
    createdBy: {
      userId: { type: String },
      name: { type: String },
    },
  },
  { timestamps: true },
);

PharmacyPurchaseSchema.index({ tenantId: 1, purchaseNo: 1 });

if (process.env.NODE_ENV !== "production" && mongoose.models.PharmacyPurchase) {
  delete (mongoose.models as Record<string, unknown>).PharmacyPurchase;
}
export default mongoose.model<IPharmacyPurchase>(
  "PharmacyPurchase",
  PharmacyPurchaseSchema,
);
