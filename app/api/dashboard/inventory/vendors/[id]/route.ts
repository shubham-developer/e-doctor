import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import InventoryVendor from "@/models/InventoryVendor";
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

  if (!body.name?.trim()) return apiError("Vendor name is required", 400);

  const vendor = await InventoryVendor.findOneAndUpdate(
    { _id: id, tenantId },
    {
      name: body.name.trim(),
      contactPerson: body.contactPerson?.trim() ?? "",
      phone: body.phone?.trim() ?? "",
      email: body.email?.trim() ?? "",
      address: body.address?.trim() ?? "",
      gstin: body.gstin?.trim() ?? "",
    },
    { new: true }
  );
  if (!vendor) return apiError("Not found", 404);

  return apiResponse({ vendor });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return apiError("Unauthorized", 401);

  const { id } = await params;
  await connectDB();

  const vendor = await InventoryVendor.findOneAndDelete({ _id: id, tenantId });
  if (!vendor) return apiError("Not found", 404);

  return apiResponse({ message: "Deleted" });
}
