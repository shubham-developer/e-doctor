import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Role from "@/models/Role";
import TenantUser from "@/models/TenantUser";
import { apiResponse, apiError } from "@/lib/api";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return apiError("Unauthorized", 401);

  const { id } = await params;
  await connectDB();
  const role = await Role.findOne({ _id: id, tenantId });
  if (!role) return apiError("Role not found", 404);
  return apiResponse(role);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const tenantId = req.headers.get("x-tenant-id");
  const userRole = req.headers.get("x-user-role");
  if (!tenantId) return apiError("Unauthorized", 401);
  if (userRole !== "OWNER")
    return apiError("Only owners can update roles", 403);

  const { id } = await params;
  await connectDB();

  const role = await Role.findOne({ _id: id, tenantId });
  if (!role) return apiError("Role not found", 404);

  const body = await req.json();
  const update: Record<string, unknown> = {};

  if (body.name !== undefined) {
    if (!body.name?.trim()) return apiError("Role name is required", 400);
    const conflict = await Role.findOne({
      tenantId,
      name: body.name.trim(),
      _id: { $ne: id },
    });
    if (conflict) return apiError("A role with this name already exists", 400);
    update.name = body.name.trim();
  }
  if (body.description !== undefined)
    update.description = body.description?.trim() || undefined;
  if (body.permissions !== undefined) update.permissions = body.permissions;

  const updated = await Role.findByIdAndUpdate(
    id,
    { $set: update },
    { new: true },
  );
  return apiResponse(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const tenantId = req.headers.get("x-tenant-id");
  const userRole = req.headers.get("x-user-role");
  if (!tenantId) return apiError("Unauthorized", 401);
  if (userRole !== "OWNER")
    return apiError("Only owners can delete roles", 403);

  const { id } = await params;
  await connectDB();

  const role = await Role.findOne({ _id: id, tenantId });
  if (!role) return apiError("Role not found", 404);
  if (role.isSystem) return apiError("System roles cannot be deleted", 400);

  // Unassign this role from any users
  await TenantUser.updateMany(
    { tenantId, customRoleId: id },
    { $unset: { customRoleId: 1 } },
  );

  await Role.deleteOne({ _id: id });
  return apiResponse({ deleted: true });
}
