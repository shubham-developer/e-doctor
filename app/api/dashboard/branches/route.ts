import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Branch from "@/models/Branch";
import { apiResponse, apiError } from "@/lib/api";

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return apiError("Unauthorized", 401);
  await connectDB();
  const branches = await Branch.find({ tenantId }).sort({ name: 1 }).lean();
  return apiResponse(branches);
}

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  const role = req.headers.get("x-user-role");
  if (!tenantId) return apiError("Unauthorized", 401);
  if (role !== "OWNER") return apiError("Only owners can add branches", 403);

  await connectDB();
  const body = await req.json();
  const { name, code, address, city, state, pincode, phone, email } = body;

  if (!name?.trim()) return apiError("Branch name is required", 400);
  if (!code?.trim()) return apiError("Branch code is required", 400);

  const exists = await Branch.findOne({
    tenantId,
    code: code.trim().toUpperCase(),
  });
  if (exists) return apiError("Branch code already exists", 409);

  const branchCount = await Branch.countDocuments({ tenantId });

  const branch = await Branch.create({
    tenantId,
    name: name.trim(),
    code: code.trim().toUpperCase(),
    address: address?.trim(),
    city: city?.trim(),
    state: state?.trim(),
    pincode: pincode?.trim(),
    phone: phone?.trim(),
    email: email?.trim(),
    isActive: true,
    isDefault: branchCount === 0,
  });

  return apiResponse(branch, 201);
}
