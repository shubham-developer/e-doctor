import mongoose, { Schema, Document } from "mongoose";

export interface IMedicine extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  category?: string;
  company?: string;
  composition?: string;
  group?: string;
  unit?: string;
  minLevel: number;
  reorderLevel: number;
  taxPercent: number;
  boxPacking?: string;
  vatAC?: string;
  rackNumber?: string;
  note?: string;
  photoUrl?: string;
  availableQty: number;
  salePrice: number;
  batchNo?: string;
  expiryDate?: string;
  createdAt: Date;
}

const MedicineSchema = new Schema<IMedicine>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    name: { type: String, required: true },
    category: { type: String },
    company: { type: String },
    composition: { type: String },
    group: { type: String },
    unit: { type: String },
    minLevel: { type: Number, default: 0 },
    reorderLevel: { type: Number, default: 10 },
    taxPercent: { type: Number, default: 0 },
    boxPacking: { type: String },
    vatAC: { type: String },
    rackNumber: { type: String },
    note: { type: String },
    photoUrl: { type: String },
    availableQty: { type: Number, default: 0 },
    salePrice: { type: Number, default: 0 },
    batchNo: { type: String },
    expiryDate: { type: String },
  },
  { timestamps: true },
);

MedicineSchema.index({ tenantId: 1, name: 1 });

if (process.env.NODE_ENV !== "production" && mongoose.models.Medicine) {
  delete (mongoose.models as Record<string, unknown>).Medicine;
}
export default mongoose.model<IMedicine>("Medicine", MedicineSchema);
