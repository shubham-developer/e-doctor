import mongoose, { Schema, Document } from "mongoose";

export interface IIpdDischargeSummary extends Document {
  tenantId: mongoose.Types.ObjectId;
  ipdId: mongoose.Types.ObjectId;
  diagnosis: string;
  historyOfPresentIllness?: string;
  examinationFindings?: string;
  investigations?: string;
  treatmentGiven?: string;
  proceduresPerformed?: string;
  conditionAtDischarge?: string;
  followUpInstructions?: string;
  medicationsAtDischarge?: string;
  additionalNotes?: string;
  writtenById?: string;
  writtenByName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const IpdDischargeSummarySchema = new Schema<IIpdDischargeSummary>(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    ipdId: {
      type: Schema.Types.ObjectId,
      ref: "IpdAdmission",
      required: true,
      unique: true,
    },
    diagnosis: { type: String, default: "" },
    historyOfPresentIllness: { type: String },
    examinationFindings: { type: String },
    investigations: { type: String },
    treatmentGiven: { type: String },
    proceduresPerformed: { type: String },
    conditionAtDischarge: { type: String },
    followUpInstructions: { type: String },
    medicationsAtDischarge: { type: String },
    additionalNotes: { type: String },
    writtenById: { type: String },
    writtenByName: { type: String },
  },
  { timestamps: true },
);

if (
  process.env.NODE_ENV !== "production" &&
  mongoose.models.IpdDischargeSummary
) {
  delete (mongoose.models as Record<string, unknown>).IpdDischargeSummary;
}
export default mongoose.model<IIpdDischargeSummary>(
  "IpdDischargeSummary",
  IpdDischargeSummarySchema,
);
