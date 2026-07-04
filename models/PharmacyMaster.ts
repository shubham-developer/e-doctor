import mongoose, { Schema, Document } from "mongoose";

export type PharmacyMasterType =
  | "category"
  | "supplier"
  | "dosage"
  | "dose_interval"
  | "dose_duration"
  | "unit"
  | "company"
  | "group";

export interface IPharmacyMaster extends Document {
  tenantId: mongoose.Types.ObjectId;
  type: PharmacyMasterType;
  name: string;
  createdAt: Date;
}

const PharmacyMasterSchema = new Schema<IPharmacyMaster>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    type: {
      type: String,
      required: true,
      enum: [
        "category",
        "supplier",
        "dosage",
        "dose_interval",
        "dose_duration",
        "unit",
        "company",
        "group",
      ],
    },
    name: { type: String, required: true },
  },
  { timestamps: true },
);

PharmacyMasterSchema.index({ tenantId: 1, type: 1 });

export default mongoose.models.PharmacyMaster ||
  mongoose.model<IPharmacyMaster>("PharmacyMaster", PharmacyMasterSchema);
