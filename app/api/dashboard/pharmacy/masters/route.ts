import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import PharmacyMaster from "@/models/PharmacyMaster";
import { apiResponse, apiError } from "@/lib/api";

const VALID_TYPES = [
  "category",
  "supplier",
  "dosage",
  "dose_interval",
  "dose_duration",
  "unit",
  "company",
  "group",
];

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return apiError("Unauthorized", 401);

  const type = req.nextUrl.searchParams.get("type");
  if (!type || !VALID_TYPES.includes(type))
    return apiError("Invalid type", 400);

  await connectDB();
  const items = await PharmacyMaster.find({ tenantId, type }).sort({ name: 1 });
  return apiResponse(items);
}

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  const role = req.headers.get("x-user-role");
  if (!tenantId) return apiError("Unauthorized", 401);
  if (role === "VIEWER") return apiError("Insufficient permissions", 403);

  await connectDB();
  const { type, name } = await req.json();
  if (!type || !VALID_TYPES.includes(type))
    return apiError("Invalid type", 400);
  if (!name?.trim()) return apiError("Name is required", 400);

  const exists = await PharmacyMaster.findOne({
    tenantId,
    type,
    name: { $regex: `^${name.trim()}$`, $options: "i" },
  });
  if (exists) return apiError("Already exists", 409);

  const item = await PharmacyMaster.create({
    tenantId,
    type,
    name: name.trim(),
  });
  return apiResponse(item, 201);
}
