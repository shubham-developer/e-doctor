import mongoose, { Schema, Document } from "mongoose";

export interface IDepartment extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  createdAt: Date;
}

const DepartmentSchema = new Schema<IDepartment>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    name: { type: String, required: true },
  },
  { timestamps: true },
);

DepartmentSchema.index({ tenantId: 1, name: 1 }, { unique: true });

if (process.env.NODE_ENV !== "production" && mongoose.models.Department) {
  delete (mongoose.models as Record<string, unknown>).Department;
}
export default mongoose.model<IDepartment>("Department", DepartmentSchema);
