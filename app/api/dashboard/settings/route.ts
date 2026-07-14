import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Tenant from "@/models/Tenant";
import TenantUser from "@/models/TenantUser";
import "@/models/Role"; // register model so populate() works
import { apiResponse, apiError } from "@/lib/api";
import {
  PRINT_LAYOUTS,
  PRINT_MODULES,
  DEFAULT_PRINT_LETTERHEAD,
  normalizeLetterheadFields,
  type PrintLetterheadConfig,
} from "@/lib/print/layouts";

function sanitizeMm(n: unknown, fallback: number, max = 297): number {
  const v = typeof n === "number" && Number.isFinite(n) ? n : fallback;
  return Math.min(Math.max(v, 0), max);
}

/** Coerce an untrusted letterhead config into a well-formed one. */
function sanitizeLetterhead(raw: unknown): PrintLetterheadConfig {
  const cfg = (raw ?? {}) as Partial<PrintLetterheadConfig>;
  const d = DEFAULT_PRINT_LETTERHEAD;
  return {
    enabled: cfg.enabled === true,
    topSpaceMm: sanitizeMm(cfg.topSpaceMm, d.topSpaceMm),
    bottomSpaceMm: sanitizeMm(cfg.bottomSpaceMm, d.bottomSpaceMm),
    leftSpaceWidthMm: sanitizeMm(cfg.leftSpaceWidthMm, d.leftSpaceWidthMm, 210),
    leftSpaceHeightMm: sanitizeMm(cfg.leftSpaceHeightMm, d.leftSpaceHeightMm),
    fillFields: cfg.fillFields === true,
    fields: normalizeLetterheadFields(cfg.fields),
  };
}

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return apiError("Unauthorized", 401);

  await connectDB();
  const [tenant, users] = await Promise.all([
    Tenant.findById(tenantId),
    TenantUser.find({ tenantId })
      .select("-passwordHash")
      .populate("customRoleId", "name _id"),
  ]);

  if (!tenant) return apiError("Tenant not found", 404);
  return apiResponse({ tenant, users });
}

export async function PATCH(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  const role = req.headers.get("x-user-role");
  if (!tenantId) return apiError("Unauthorized", 401);
  if (role === "VIEWER") return apiError("Insufficient permissions", 403);

  await connectDB();
  const body = await req.json();
  const allowed = [
    "name",
    "hospitalCode",
    "phone",
    "email",
    "address",
    "city",
    "state",
    "pincode",
    "country",
    "brandColor",
    "logoUrl",
    "smallLogoUrl",
    "notifications",
    "language",
    "dateFormat",
    "timeZone",
    "currency",
    "currencySymbol",
    "creditLimit",
    "timeFormat",
    "opdRevisitDays",
    "opdFreeRevisits",
  ];

  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  // Only known module keys mapped to known layout ids survive
  if ("printLayouts" in body && typeof body.printLayouts === "object") {
    const sanitized: Record<string, string> = {};
    for (const { key } of PRINT_MODULES) {
      const id = body.printLayouts?.[key];
      if (typeof id === "string" && id in PRINT_LAYOUTS) sanitized[key] = id;
    }
    update.printLayouts = sanitized;
  }

  // Only known module keys mapped to booleans survive
  if ("printShowLogo" in body && typeof body.printShowLogo === "object") {
    const sanitized: Record<string, boolean> = {};
    for (const { key } of PRINT_MODULES) {
      const show = body.printShowLogo?.[key];
      if (typeof show === "boolean") sanitized[key] = show;
    }
    update.printShowLogo = sanitized;
  }

  // Only known module keys mapped to strings survive; script tags are stripped
  // since this HTML is injected verbatim into printed documents.
  if (
    "printFooterContents" in body &&
    typeof body.printFooterContents === "object"
  ) {
    const sanitized: Record<string, string> = {};
    for (const { key } of PRINT_MODULES) {
      const html = body.printFooterContents?.[key];
      if (typeof html === "string") {
        sanitized[key] = html
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .slice(0, 20000);
      }
    }
    update.printFooterContents = sanitized;
  }

  // Only known module keys mapped to well-formed letterhead configs survive
  if ("printLetterheads" in body && typeof body.printLetterheads === "object") {
    const sanitized: Record<string, PrintLetterheadConfig> = {};
    for (const { key } of PRINT_MODULES) {
      const cfg = body.printLetterheads?.[key];
      if (cfg && typeof cfg === "object") {
        sanitized[key] = sanitizeLetterhead(cfg);
      }
    }
    update.printLetterheads = sanitized;
  }

  const tenant = await Tenant.findByIdAndUpdate(
    tenantId,
    { $set: update },
    { new: true },
  );
  if (!tenant) return apiError("Tenant not found", 404);
  return apiResponse(tenant);
}
