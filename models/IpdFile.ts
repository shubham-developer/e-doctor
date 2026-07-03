import mongoose, { Schema, Document } from "mongoose";

export interface IIpdFile extends Document {
  tenantId: mongoose.Types.ObjectId;
  ipdId: mongoose.Types.ObjectId;
  filename: string;
  mimeType: string;
  size: number;
  data: Buffer;
  uploadedByName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const IpdFileSchema = new Schema<IIpdFile>(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    ipdId: { type: Schema.Types.ObjectId, ref: "IpdAdmission", required: true, index: true },
    filename: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    data: { type: Buffer, required: true },
    uploadedByName: { type: String },
  },
  { timestamps: true },
);

if (process.env.NODE_ENV !== "production" && mongoose.models.IpdFile) {
  delete (mongoose.models as Record<string, unknown>).IpdFile;
}
export default mongoose.model<IIpdFile>("IpdFile", IpdFileSchema);
