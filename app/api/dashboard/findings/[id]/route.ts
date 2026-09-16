import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import FindingMaster from "@/models/FindingMaster";
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
  const { category, list } = await req.json();
  if (!category?.trim()) return apiError("Category is required", 400);
  if (!list?.trim()) return apiError("List is required", 400);

  const item = await FindingMaster.findOneAndUpdate(
    { _id: id, tenantId },
    { $set: { category: category.trim(), list: list.trim() } },
    { new: true },
  );
  if (!item) return apiError("Not found", 404);
  return apiResponse(item);
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
  const item = await FindingMaster.findOneAndDelete({ _id: id, tenantId });
  if (!item) return apiError("Not found", 404);
  return apiResponse({ deleted: true });
}
