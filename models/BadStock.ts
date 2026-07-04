import mongoose, { Schema, Document } from "mongoose";

export interface IBadStock extends Document {
  tenantId: string;
  medicineId: mongoose.Types.ObjectId;
  medicineName: string;
  batchNo: string;
  expiryDate: string;
  outwardDate: string;
  note: string;
  createdAt: Date;
}

const BadStockSchema = new Schema<IBadStock>(
  {
    tenantId: { type: String, required: true },
    medicineId: {
      type: Schema.Types.ObjectId,
      ref: "Medicine",
      required: true,
    },
    medicineName: { type: String, required: true },
    batchNo: { type: String, default: "" },
    expiryDate: { type: String, default: "" },
    outwardDate: { type: String, required: true },
    note: { type: String, default: "" },
  },
  { timestamps: true },
);

BadStockSchema.index({ tenantId: 1, createdAt: -1 });

export default mongoose.models.BadStock ||
  mongoose.model<IBadStock>("BadStock", BadStockSchema);
