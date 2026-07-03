import mongoose, { Schema, Document } from "mongoose";

export interface IIpdVital extends Document {
  tenantId: mongoose.Types.ObjectId;
  ipdId: mongoose.Types.ObjectId;
  recordedAt: string; // datetime-local string "YYYY-MM-DDTHH:mm"
  temperature?: number; // °F
  bpSystolic?: number; // mmHg
  bpDiastolic?: number; // mmHg
  pulseRate?: number; // bpm
  spo2?: number; // %
  respiratoryRate?: number; // breaths/min
  rbs?: number; // mg/dL
  weight?: number; // kg
  note?: string;
  recordedByName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const IpdVitalSchema = new Schema<IIpdVital>(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    ipdId: { type: Schema.Types.ObjectId, ref: "IpdAdmission", required: true, index: true },
    recordedAt: { type: String, required: true },
    temperature: { type: Number },
    bpSystolic: { type: Number },
    bpDiastolic: { type: Number },
    pulseRate: { type: Number },
    spo2: { type: Number },
    respiratoryRate: { type: Number },
    rbs: { type: Number },
    weight: { type: Number },
    note: { type: String },
    recordedByName: { type: String },
  },
  { timestamps: true },
);

if (process.env.NODE_ENV !== "production" && mongoose.models.IpdVital) {
  delete (mongoose.models as Record<string, unknown>).IpdVital;
}
export default mongoose.model<IIpdVital>("IpdVital", IpdVitalSchema);
