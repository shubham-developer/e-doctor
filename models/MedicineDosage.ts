import mongoose, { Schema, Document } from "mongoose";

export interface IMedicineDosage extends Document {
  tenantId: mongoose.Types.ObjectId;
  category: string;
  dosage: string;
  unit: string;
  createdAt: Date;
}

const MedicineDosageSchema = new Schema<IMedicineDosage>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    category: { type: String, required: true },
    dosage: { type: String, required: true },
    unit: { type: String, default: "" },
  },
  { timestamps: true },
);

MedicineDosageSchema.index({ tenantId: 1 });

export default mongoose.models.MedicineDosage ||
  mongoose.model<IMedicineDosage>("MedicineDosage", MedicineDosageSchema);
