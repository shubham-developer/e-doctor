import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Department from "@/models/Department";
import { apiResponse, apiError } from "@/lib/api";

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return apiError("Unauthorized", 401);
  await connectDB();
  const items = await Department.find({ tenantId }).sort({ name: 1 });
  return apiResponse({ items });
}

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  const role = req.headers.get("x-user-role");
  if (!tenantId) return apiError("Unauthorized", 401);
  if (role === "VIEWER") return apiError("Insufficient permissions", 403);
  await connectDB();
  const { name } = await req.json();
  if (!name?.trim()) return apiError("Name is required", 400);
  try {
    const item = await Department.create({ tenantId, name: name.trim() });
    return apiResponse(item, 201);
  } catch (e: unknown) {
    if ((e as { code?: number }).code === 11000)
      return apiError("Department already exists", 409);
    throw e;
  }
}
