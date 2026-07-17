import mongoose, { Schema, Document } from "mongoose";

export interface IOpdChargeLine {
  categoryId?: mongoose.Types.ObjectId;
  name: string;
  fee: number;
}

export interface IOpdVisit extends Document {
  tenantId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  doctorId?: mongoose.Types.ObjectId;
  opdNumber: number;
  visitDate: string;
  // clinical
  chiefComplaint: string;
  symptomsType?: string;
  symptomsTitle?: string;
  note?: string;
  knownAllergiesOverride?: string;
  previousMedicalIssue?: string;
  // meta
  caseNumber?: string;
  reference?: string;
  casualty?: boolean;
  isOldPatient?: boolean;
  isAntenatal?: boolean;
  liveConsultation?: boolean;
  // billing
  charges: IOpdChargeLine[];
  totalFee: number;
  appliedCharge?: number;
  discount?: number;
  tax?: number;
  paymentMode?: string;
  paidAmount?: number;
  applyTpa?: boolean;
  status: "WAITING" | "IN_PROGRESS" | "COMPLETED";
  createdBy?: { userId: string; name: string };
  createdAt: Date;
}

const OpdVisitSchema = new Schema<IOpdVisit>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true },
    patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    doctorId: { type: Schema.Types.ObjectId, ref: "Staff" },
    opdNumber: { type: Number, required: true },
    visitDate: { type: String, required: true },
    // clinical
    chiefComplaint: { type: String, default: "" },
    symptomsType: { type: String },
    symptomsTitle: { type: String },
    note: { type: String },
    knownAllergiesOverride: { type: String },
    previousMedicalIssue: { type: String },
    // meta
    caseNumber: { type: String },
    reference: { type: String },
    casualty: { type: Boolean, default: false },
    isOldPatient: { type: Boolean, default: false },
    isAntenatal: { type: Boolean, default: false },
    liveConsultation: { type: Boolean, default: false },
    // billing
    charges: [
      {
        categoryId: { type: Schema.Types.ObjectId, ref: "ChargeCategory" },
        name: { type: String, required: true },
        fee: { type: Number, default: 0 },
      },
    ],
    totalFee: { type: Number, default: 0 },
    appliedCharge: { type: Number },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    paymentMode: { type: String, default: "CASH" },
    paidAmount: { type: Number, default: 0 },
    applyTpa: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["WAITING", "IN_PROGRESS", "COMPLETED"],
      default: "WAITING",
    },
    createdBy: {
      userId: { type: String },
      name: { type: String },
    },
  },
  { timestamps: true },
);

OpdVisitSchema.index({ tenantId: 1, visitDate: 1 });
OpdVisitSchema.index({ branchId: 1, visitDate: 1 });

if (process.env.NODE_ENV !== "production" && mongoose.models.OpdVisit) {
  delete (mongoose.models as Record<string, unknown>).OpdVisit;
}
export default mongoose.model<IOpdVisit>("OpdVisit", OpdVisitSchema);
