import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import TpaSettlement from "@/models/TpaSettlement";
import "@/models/Tpa";
import { apiResponse, apiError } from "@/lib/api";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return apiError("Unauthorized", 401);
  const { id } = await params;
  await connectDB();
  const settlement = await TpaSettlement.findOne({ _id: id, tenantId })
    .populate("tpaId", "name code type phone email")
    .populate("claimIds")
    .lean();
  if (!settlement) return apiError("Settlement not found", 404);
  return apiResponse(settlement);
}
