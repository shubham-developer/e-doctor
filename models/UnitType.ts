import mongoose, { Schema, Document } from "mongoose";

export interface IUnitType extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
}

const UnitTypeSchema = new Schema<IUnitType>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    name: { type: String, required: true },
    description: { type: String },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

UnitTypeSchema.index({ tenantId: 1, sortOrder: 1 });

export default mongoose.models.UnitType ||
  mongoose.model<IUnitType>("UnitType", UnitTypeSchema);
