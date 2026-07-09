import mongoose, { Schema, Document } from "mongoose";
import { ALL_MODULE_KEYS } from "@/lib/constants/modules";
import type { PrintTemplate } from "@/lib/print/customTemplate";

export interface ITenant extends Document {
  name: string;
  slug: string;
  hospitalCode: string;
  phone: string;
  email: string;
  logoUrl: string;
  smallLogoUrl: string;
  brandColor: string;
  language: string;
  dateFormat: string;
  timeZone: string;
  currency: string;
  currencySymbol: string;
  creditLimit: number;
  timeFormat: string;
  plan: "STARTER" | "GROWTH" | "PRO";
  planExpiresAt: Date;
  isActive: boolean;
  /** Module keys (see lib/constants/modules.ts) this tenant can access. */
  enabledModules: string[];
  notifications: {
    reminder24h: boolean;
    reminder1h: boolean;
  };
  /** Print layout template per module (module key → PrintLayoutId), see lib/print/layouts.ts */
  printLayouts: Record<string, string>;
  /** Custom Print Layout Builder designs per document (PrintDocumentKey → PrintTemplate), see lib/print/customTemplate.ts */
  customPrintTemplates: Record<string, PrintTemplate>;
  address: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  createdAt: Date;
}

const TenantSchema = new Schema<ITenant>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    hospitalCode: { type: String, default: "" },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    logoUrl: { type: String, default: "" },
    smallLogoUrl: { type: String, default: "" },
    brandColor: { type: String, default: "#0ea5a0" },
    language: { type: String, default: "English" },
    dateFormat: { type: String, default: "MM/DD/YYYY" },
    timeZone: { type: String, default: "(GMT+05:30) Asia, Kolkata" },
    currency: { type: String, default: "INR" },
    currencySymbol: { type: String, default: "₹" },
    creditLimit: { type: Number, default: 0 },
    timeFormat: { type: String, default: "12 Hour" },
    plan: {
      type: String,
      enum: ["STARTER", "GROWTH", "PRO"],
      default: "STARTER",
    },
    planExpiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    isActive: { type: Boolean, default: true },
    enabledModules: { type: [String], default: () => [...ALL_MODULE_KEYS] },
    notifications: {
      reminder24h: { type: Boolean, default: true },
      reminder1h: { type: Boolean, default: true },
    },
    printLayouts: { type: Schema.Types.Mixed, default: {} },
    customPrintTemplates: { type: Schema.Types.Mixed, default: {} },
    address: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    pincode: { type: String, default: "" },
    country: { type: String, default: "India" },
  },
  { timestamps: true },
);

export default mongoose.models.Tenant ||
  mongoose.model<ITenant>("Tenant", TenantSchema);
