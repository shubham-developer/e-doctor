import mongoose, { Schema, Document } from "mongoose";
import { ALL_MODULE_KEYS } from "@/lib/constants/modules";

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
  /** Whether the clinic logo prints per module (module key → boolean, default true), see lib/print/layouts.ts */
  printShowLogo: Record<string, boolean>;
  /** Custom letterhead image per module (module key → serving URL); replaces the standard print header when set. */
  printHeaderImages: Record<string, string>;
  /** Rich-text footer HTML per module printed at the bottom of documents. */
  printFooterContents: Record<string, string>;
  /** Pre-printed letterhead setup per module (module key → PrintLetterheadConfig), see lib/print/layouts.ts */
  printLetterheads: Record<string, unknown>;
  opdRevisitDays: number;
  opdFreeRevisits: number;
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
    printShowLogo: { type: Schema.Types.Mixed, default: {} },
    printHeaderImages: { type: Schema.Types.Mixed, default: {} },
    printFooterContents: { type: Schema.Types.Mixed, default: {} },
    printLetterheads: { type: Schema.Types.Mixed, default: {} },
    opdRevisitDays: { type: Number, default: 0 },
    opdFreeRevisits: { type: Number, default: 0 },
    address: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    pincode: { type: String, default: "" },
    country: { type: String, default: "India" },
  },
  { timestamps: true },
);

if (process.env.NODE_ENV !== "production" && mongoose.models.Tenant) {
  delete mongoose.models.Tenant;
}

export default mongoose.models.Tenant ||
  mongoose.model<ITenant>("Tenant", TenantSchema);
