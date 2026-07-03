import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import ChargeType from "@/models/ChargeType";
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
  const item = await ChargeType.findOneAndUpdate(
    { _id: id, tenantId },
    { $set: body },
    { new: true },
  );

  if (!item) return apiError("Charge type not found", 404);
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

  const item = await ChargeType.findOneAndDelete({ _id: id, tenantId });
  if (!item) return apiError("Charge type not found", 404);
  return apiResponse({ deleted: true });
}
