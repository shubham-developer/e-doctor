import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import OpdVital from "@/models/OpdVital";
import { apiResponse, apiError } from "@/lib/api";

type Ctx = { params: Promise<{ id: string; vitalId: string }> };

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const tenantId = req.headers.get("x-tenant-id");
  const role = req.headers.get("x-user-role");
  if (!tenantId) return apiError("Unauthorized", 401);
  if (role === "VIEWER") return apiError("Insufficient permissions", 403);

  const { vitalId } = await params;
  await connectDB();

  const vital = await OpdVital.findOneAndDelete({ _id: vitalId, tenantId });
  if (!vital) return apiError("Record not found", 404);

  return apiResponse({ deleted: true });
}
