import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Tenant from "@/models/Tenant";
import { apiResponse, apiError } from "@/lib/api";
import { uploadObject } from "@/lib/storage";

const MAX_SIZE = 2 * 1024 * 1024; // 2 MB
const LOGO_FIELDS = {
  logo: "logoUrl",
  smallLogo: "smallLogoUrl",
} as const;

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  const role = req.headers.get("x-user-role");
  if (!tenantId) return apiError("Unauthorized", 401);
  if (role === "VIEWER") return apiError("Insufficient permissions", 403);

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return apiError("Invalid form data", 400);
  }

  const file = formData.get("file") as File | null;
  const type = formData.get("type");
  if (!file) return apiError("No file provided", 400);
  if (typeof type !== "string" || !(type in LOGO_FIELDS)) {
    return apiError("Invalid logo type", 400);
  }
  if (!file.type.startsWith("image/")) {
    return apiError("File must be an image", 400);
  }
  if (file.size > MAX_SIZE) return apiError("Image must be under 2 MB", 400);

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const storageKey = `logos/${tenantId}/${type}`;

  await uploadObject(storageKey, buffer, file.type);

  await connectDB();

  const field = LOGO_FIELDS[type as keyof typeof LOGO_FIELDS];
  const url = `/api/dashboard/settings/logo/${type}`;
  const tenant = await Tenant.findByIdAndUpdate(
    tenantId,
    { $set: { [field]: url } },
    { new: true },
  );
  if (!tenant) return apiError("Tenant not found", 404);

  return apiResponse({ url });
}
