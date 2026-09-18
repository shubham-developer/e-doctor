import mongoose, { Schema, Document } from "mongoose";

export interface INurseNote extends Document {
  tenantId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  note: string;
  vitalSigns?: {
    bp?: string;
    pulse?: number;
    temp?: number;
    weight?: number;
    o2Sat?: number;
    respRate?: number;
  };
  addedById: string;
  addedByName: string;
  addedByRole: string;
  createdAt: Date;
  updatedAt: Date;
}

const NurseNoteSchema = new Schema<INurseNote>(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true },
    patientId: {
      type: Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
      index: true,
    },
    note: { type: String, required: true },
    vitalSigns: {
      bp: String,
      pulse: Number,
      temp: Number,
      weight: Number,
      o2Sat: Number,
      respRate: Number,
    },
    addedById: { type: String, required: true },
    addedByName: { type: String, required: true },
    addedByRole: { type: String, required: true },
  },
  { timestamps: true },
);

export default mongoose.models.NurseNote ||
  mongoose.model<INurseNote>("NurseNote", NurseNoteSchema);
