import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import ChargeCategory from "@/models/ChargeCategory";
import { apiResponse, apiError } from "@/lib/api";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const tenantId = req.headers.get("x-tenant-id");
  const role = req.headers.get("x-user-role");
  if (!tenantId) return apiError("Unauthorized", 401);
  if (role === "VIEWER") return apiError("Insufficient permissions", 403);

  const { id } = await params;
  await connectDB();

  const body = await req.json();

  // strict: false allows updating fields like appliesTo even if model cache is stale
  const item = await ChargeCategory.findOneAndUpdate(
    { _id: id, tenantId },
    { $set: body },
    { new: true, strict: false },
  ).lean();

  if (!item) return apiError("Category not found", 404);

  return apiResponse({
    ...item,
    _id: String(item._id),
    chargeTypeId: null,
    chargeTypeName: null,
    appliesTo: (item as Record<string, unknown>).appliesTo ?? [],
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const tenantId = req.headers.get("x-tenant-id");
  const role = req.headers.get("x-user-role");
  if (!tenantId) return apiError("Unauthorized", 401);
  if (role === "VIEWER") return apiError("Insufficient permissions", 403);

  const { id } = await params;
  await connectDB();

  const item = await ChargeCategory.findOneAndDelete({ _id: id, tenantId });
  if (!item) return apiError("Category not found", 404);
  return apiResponse({ deleted: true });
}
