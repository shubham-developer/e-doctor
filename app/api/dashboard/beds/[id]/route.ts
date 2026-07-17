import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Bed from "@/models/Bed";
import { apiResponse, apiError } from "@/lib/api";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const tenantId = req.headers.get("x-tenant-id");
  const branchId = req.headers.get("x-branch-id") ?? undefined;
  const role = req.headers.get("x-user-role");
  if (!tenantId) return apiError("Unauthorized", 401);
  if (role === "VIEWER") return apiError("Insufficient permissions", 403);

  const { id } = await params;
  await connectDB();

  const body = await req.json();
  delete body.branchId;
  const bed = await Bed.findOneAndUpdate(
    { _id: id, tenantId, branchId },
    { $set: body },
    { new: true },
  );
  if (!bed) return apiError("Bed not found", 404);
  return apiResponse(bed);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const tenantId = req.headers.get("x-tenant-id");
  const branchId = req.headers.get("x-branch-id") ?? undefined;
  const role = req.headers.get("x-user-role");
  if (!tenantId) return apiError("Unauthorized", 401);
  if (role === "VIEWER") return apiError("Insufficient permissions", 403);

  const { id } = await params;
  await connectDB();

  const bed = await Bed.findOneAndDelete({ _id: id, tenantId, branchId });
  if (!bed) return apiError("Bed not found", 404);
  return apiResponse({ deleted: true });
}
