import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Charge from "@/models/Charge";
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
  const charge = await Charge.findOneAndUpdate(
    { _id: id, tenantId },
    { $set: body },
    { new: true },
  );

  if (!charge) return apiError("Charge not found", 404);
  return apiResponse(charge);
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

  const charge = await Charge.findOneAndDelete({ _id: id, tenantId });
  if (!charge) return apiError("Charge not found", 404);
  return apiResponse({ deleted: true });
}
