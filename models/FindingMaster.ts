import mongoose, { Schema, Document } from "mongoose";

export interface IFindingMaster extends Document {
  tenantId: mongoose.Types.ObjectId;
  category: string;
  list: string;
  createdAt: Date;
}

const FindingMasterSchema = new Schema<IFindingMaster>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    category: { type: String, required: true },
    list: { type: String, required: true },
  },
  { timestamps: true },
);

FindingMasterSchema.index({ tenantId: 1 });

export default mongoose.models.FindingMaster ||
  mongoose.model<IFindingMaster>("FindingMaster", FindingMasterSchema);
