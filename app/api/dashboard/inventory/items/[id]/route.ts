import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import InventoryItem from "@/models/InventoryItem";
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
  if (!body.categoryId) return apiError("Category is required", 400);

  const item = await InventoryItem.findOneAndUpdate(
    { _id: id, tenantId },
    {
      name: body.name.trim(),
      categoryId: body.categoryId,
      unit: body.unit?.trim() || "Pcs",
      reorderLevel: Number(body.reorderLevel ?? 0),
      maxStock: Number(body.maxStock ?? 0),
      unitCost: Number(body.unitCost ?? 0),
      location: body.location?.trim() ?? "",
      description: body.description?.trim() ?? "",
      isActive: body.isActive !== false,
    },
    { new: true }
  );
  if (!item) return apiError("Not found", 404);

  return apiResponse({ item });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return apiError("Unauthorized", 401);

  const { id } = await params;
  await connectDB();

  const item = await InventoryItem.findOneAndDelete({ _id: id, tenantId });
  if (!item) return apiError("Not found", 404);

  return apiResponse({ message: "Deleted" });
}
