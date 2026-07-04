import mongoose, { Schema, Document } from "mongoose";

export interface IMedicineLine {
  category?: string;
  name: string;
  dose?: string;
  doseInterval?: string;
  doseDuration?: string;
  instruction?: string;
}

export interface IFinding {
  category?: string;
  list?: string;
  description?: string;
  print?: boolean;
}

export interface IPrescription extends Document {
  tenantId: mongoose.Types.ObjectId;
  opdVisitId: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  doctorId?: mongoose.Types.ObjectId;
  headerNote?: string;
  findings: IFinding[];
  medicines: IMedicineLine[];
  footerNote?: string;
  pathology?: string;
  radiology?: string;
  createdAt: Date;
}

const PrescriptionSchema = new Schema<IPrescription>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    opdVisitId: {
      type: Schema.Types.ObjectId,
      ref: "OpdVisit",
      required: true,
    },
    patientId: { type: Schema.Types.ObjectId, ref: "Patient", required: true },
    doctorId: { type: Schema.Types.ObjectId, ref: "Doctor" },
    headerNote: { type: String },
    findings: [
      {
        category: String,
        list: String,
        description: String,
        print: { type: Boolean, default: true },
      },
    ],
    medicines: [
      {
        category: String,
        name: { type: String, required: true },
        dose: String,
        doseInterval: String,
        doseDuration: String,
        instruction: String,
      },
    ],
    footerNote: { type: String },
    pathology: { type: String },
    radiology: { type: String },
  },
  { timestamps: true },
);

PrescriptionSchema.index({ tenantId: 1, opdVisitId: 1 });

export default mongoose.models.Prescription ||
  mongoose.model<IPrescription>("Prescription", PrescriptionSchema);
