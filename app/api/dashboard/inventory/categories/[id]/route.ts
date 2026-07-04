import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import InventoryCategory from "@/models/InventoryCategory";
import { apiResponse, apiError } from "@/lib/api";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return apiError("Unauthorized", 401);

  const { id } = await params;
  await connectDB();
  const body = await req.json();

  if (!body.name?.trim()) return apiError("Name is required", 400);

  const category = await InventoryCategory.findOneAndUpdate(
    { _id: id, tenantId },
    { name: body.name.trim(), description: body.description?.trim() ?? "" },
    { new: true }
  );
  if (!category) return apiError("Not found", 404);

  return apiResponse({ category });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return apiError("Unauthorized", 401);

  const { id } = await params;
  await connectDB();

  const category = await InventoryCategory.findOneAndDelete({ _id: id, tenantId });
  if (!category) return apiError("Not found", 404);

  return apiResponse({ message: "Deleted" });
}
