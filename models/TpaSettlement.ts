import mongoose, { Schema, Document } from "mongoose";

export interface ITpaSettlement extends Document {
  tenantId: mongoose.Types.ObjectId;
  batchNo: string;
  tpaId: mongoose.Types.ObjectId;
  settlementDate: string;
  paymentMode: string;
  paymentRef?: string;
  totalClaimed: number;
  totalApproved: number;
  totalSettled: number;
  tdsDeducted: number;
  processingFee: number;
  claimIds: mongoose.Types.ObjectId[];
  remarks?: string;
  createdBy: string;
  createdAt: Date;
}

const TpaSettlementSchema = new Schema<ITpaSettlement>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    batchNo: { type: String, required: true },
    tpaId: { type: Schema.Types.ObjectId, ref: "Tpa", required: true },
    settlementDate: { type: String, required: true },
    paymentMode: { type: String, default: "NEFT" },
    paymentRef: { type: String },
    totalClaimed: { type: Number, default: 0 },
    totalApproved: { type: Number, default: 0 },
    totalSettled: { type: Number, default: 0 },
    tdsDeducted: { type: Number, default: 0 },
    processingFee: { type: Number, default: 0 },
    claimIds: [{ type: Schema.Types.ObjectId, ref: "TpaClaim" }],
    remarks: { type: String },
    createdBy: { type: String, default: "" },
  },
  { timestamps: true },
);

TpaSettlementSchema.index({ tenantId: 1, batchNo: 1 }, { unique: true });
TpaSettlementSchema.index({ tenantId: 1, tpaId: 1 });

if (process.env.NODE_ENV !== "production" && mongoose.models.TpaSettlement) {
  delete (mongoose.models as Record<string, unknown>).TpaSettlement;
}
export default mongoose.model<ITpaSettlement>("TpaSettlement", TpaSettlementSchema);
