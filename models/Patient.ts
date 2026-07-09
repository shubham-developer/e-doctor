import mongoose, { Schema, Document } from "mongoose";
import { encrypt, decrypt } from "@/lib/crypto";

export interface IPatient extends Document {
  tenantId: mongoose.Types.ObjectId;
  uhid: number;
  name: string;
  guardianName?: string;
  gender?: string;
  dateOfBirth?: string;
  age: number;
  ageMonths?: number;
  ageDays?: number;
  bloodGroup?: string;
  maritalStatus?: string;
  phone?: string;
  email?: string;
  address?: string;
  remarks?: string;
  allergies?: string;
  tpa?: string;
  tpaId?: string;
  tpaValidity?: string;
  nationalId?: string;
  alternateNumber?: string;
  isDead?: boolean;
  languagePref: "hi" | "en";
  createdAt: Date;
}

const PatientSchema = new Schema<IPatient>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    uhid: { type: Number },
    name: { type: String, required: true },
    guardianName: { type: String },
    gender: { type: String },
    dateOfBirth: { type: String },
    age: { type: Number, default: 0 },
    ageMonths: { type: Number, default: 0 },
    ageDays: { type: Number, default: 0 },
    bloodGroup: { type: String },
    maritalStatus: { type: String },
    phone: { type: String },
    email: {
      type: String,
      set: (v?: string) => (v ? encrypt(v) : v),
      get: (v?: string) => (v ? decrypt(v) : v),
    },
    address: { type: String },
    remarks: { type: String },
    allergies: { type: String },
    tpa: { type: String },
    tpaId: { type: String },
    tpaValidity: { type: String },
    nationalId: { type: String },
    alternateNumber: { type: String },
    isDead: { type: Boolean, default: false },
    languagePref: { type: String, enum: ["hi", "en"], default: "hi" },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true },
  },
);

export default mongoose.models.Patient ||
  mongoose.model<IPatient>("Patient", PatientSchema);
