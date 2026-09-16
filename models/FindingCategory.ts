import mongoose, { Schema, Document } from "mongoose";

export interface IFindingCategory extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  createdAt: Date;
}

const FindingCategorySchema = new Schema<IFindingCategory>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    name: { type: String, required: true },
  },
  { timestamps: true },
);

FindingCategorySchema.index({ tenantId: 1, name: 1 }, { unique: true });

export default mongoose.models.FindingCategory ||
  mongoose.model<IFindingCategory>("FindingCategory", FindingCategorySchema);
