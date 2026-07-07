import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Department from "@/models/Department";
import { apiResponse, apiError } from "@/lib/api";

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
  const item = await Department.findOneAndDelete({ _id: id, tenantId });
  if (!item) return apiError("Not found", 404);
  return apiResponse({ deleted: true });
}
