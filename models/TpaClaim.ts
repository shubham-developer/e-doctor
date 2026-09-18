import mongoose, { Schema, Document } from "mongoose";

export type ClaimModule = "IPD" | "OPD" | "PATHOLOGY" | "RADIOLOGY";
export type ClaimStatus =
  | "DRAFT"
  | "FILED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "PARTIALLY_APPROVED"
  | "REJECTED"
  | "SETTLED"
  | "RE_FILED";
export type PreAuthStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface ITpaClaim extends Document {
  tenantId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  claimNo: string;
  patientId: mongoose.Types.ObjectId;
  tpaId: mongoose.Types.ObjectId;
  moduleType: ClaimModule;
  referenceId: mongoose.Types.ObjectId;

  // amounts
  claimedAmount: number;
  approvedAmount?: number;
  settledAmount?: number;
  coPayment?: number;
  tdsDeducted?: number;
  processingFee?: number;

  // pre-auth
  preAuthNo?: string;
  preAuthDate?: string;
  preAuthRequestedAmount?: number;
  preAuthApprovedAmount?: number;
  preAuthStatus?: PreAuthStatus;
  preAuthRemarks?: string;

  // claim status
  filedDate?: string;
  status: ClaimStatus;
  rejectionReason?: string;
  remarks?: string;

  // settlement
  settlementDate?: string;
  settlementRef?: string;
  settlementBatchId?: mongoose.Types.ObjectId;

  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
}

const TpaClaimSchema = new Schema<ITpaClaim>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true },
    claimNo: { type: String, required: true },
    patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    tpaId: { type: Schema.Types.ObjectId, ref: "Tpa", required: true },
    moduleType: {
      type: String,
      enum: ["IPD", "OPD", "PATHOLOGY", "RADIOLOGY"],
      required: true,
    },
    referenceId: { type: Schema.Types.ObjectId, required: true },

    claimedAmount: { type: Number, default: 0 },
    approvedAmount: { type: Number },
    settledAmount: { type: Number },
    coPayment: { type: Number, default: 0 },
    tdsDeducted: { type: Number, default: 0 },
    processingFee: { type: Number, default: 0 },

    preAuthNo: { type: String },
    preAuthDate: { type: String },
    preAuthRequestedAmount: { type: Number },
    preAuthApprovedAmount: { type: Number },
    preAuthStatus: { type: String, enum: ["PENDING", "APPROVED", "REJECTED"] },
    preAuthRemarks: { type: String },

    filedDate: { type: String },
    status: {
      type: String,
      enum: ["DRAFT", "FILED", "UNDER_REVIEW", "APPROVED", "PARTIALLY_APPROVED", "REJECTED", "SETTLED", "RE_FILED"],
      default: "DRAFT",
    },
    rejectionReason: { type: String },
    remarks: { type: String },

    settlementDate: { type: String },
    settlementRef: { type: String },
    settlementBatchId: { type: Schema.Types.ObjectId, ref: "TpaSettlement" },

    createdBy: { type: String, default: "" },
    updatedBy: { type: String },
  },
  { timestamps: true },
);

TpaClaimSchema.index({ tenantId: 1, claimNo: 1 }, { unique: true });
TpaClaimSchema.index({ tenantId: 1, patientId: 1 });
TpaClaimSchema.index({ tenantId: 1, tpaId: 1 });
TpaClaimSchema.index({ tenantId: 1, referenceId: 1 });
TpaClaimSchema.index({ tenantId: 1, status: 1 });

if (process.env.NODE_ENV !== "production" && mongoose.models.TpaClaim) {
  delete (mongoose.models as Record<string, unknown>).TpaClaim;
}
export default mongoose.model<ITpaClaim>("TpaClaim", TpaClaimSchema);
