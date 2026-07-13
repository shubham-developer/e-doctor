import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Tenant from "@/models/Tenant";
import TenantUser from "@/models/TenantUser";
import "@/models/Role"; // register model so populate() works
import { apiResponse, apiError } from "@/lib/api";
import { PRINT_LAYOUTS, PRINT_MODULES } from "@/lib/print/layouts";

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

  const tenant = await Tenant.findByIdAndUpdate(
    tenantId,
    { $set: update },
    { new: true },
  );
  if (!tenant) return apiError("Tenant not found", 404);
  return apiResponse(tenant);
}
