import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Branch from "@/models/Branch";
import { apiResponse, apiError } from "@/lib/api";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const tenantId = req.headers.get("x-tenant-id");
  const role = req.headers.get("x-user-role");
  if (!tenantId) return apiError("Unauthorized", 401);
  if (role !== "OWNER") return apiError("Only owners can edit branches", 403);

  const { id } = await params;
  await connectDB();
  const body = await req.json();
  const { name, code, address, city, state, pincode, phone, email, isActive, isDefault } = body;

  if (!name?.trim()) return apiError("Branch name is required", 400);

  const duplicate = await Branch.findOne({
    tenantId,
    code: code?.trim().toUpperCase(),
    _id: { $ne: id },
  });
  if (duplicate) return apiError("Branch code already exists", 409);

  if (isDefault) {
    await Branch.updateMany(
      { tenantId, _id: { $ne: id } },
      { $set: { isDefault: false } },
    );
  }

  const branch = await Branch.findOneAndUpdate(
    { _id: id, tenantId },
    {
      name: name.trim(),
      code: code?.trim().toUpperCase(),
      address: address?.trim(),
      city: city?.trim(),
      state: state?.trim(),
      pincode: pincode?.trim(),
      phone: phone?.trim(),
      email: email?.trim(),
      isActive: isActive !== false,
      isDefault: !!isDefault,
    },
    { new: true },
  );
  if (!branch) return apiError("Branch not found", 404);
  return apiResponse(branch);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const tenantId = req.headers.get("x-tenant-id");
  const role = req.headers.get("x-user-role");
  if (!tenantId) return apiError("Unauthorized", 401);
  if (role !== "OWNER")
    return apiError("Only owners can remove branches", 403);

  const { id } = await params;
  await connectDB();

  const activeCount = await Branch.countDocuments({ tenantId, isActive: true });
  const branch = await Branch.findOne({ _id: id, tenantId });
  if (!branch) return apiError("Branch not found", 404);
  if (branch.isActive && activeCount <= 1) {
    return apiError("A hospital must have at least one active branch", 400);
  }

  branch.isActive = false;
  branch.isDefault = false;
  await branch.save();

  const remainingDefault = await Branch.findOne({ tenantId, isDefault: true });
  if (!remainingDefault) {
    const fallback = await Branch.findOne({ tenantId, isActive: true }).sort({
      createdAt: 1,
    });
    if (fallback) {
      fallback.isDefault = true;
      await fallback.save();
    }
  }

  return apiResponse({ deleted: true });
}
