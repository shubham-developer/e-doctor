import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import InventoryPurchase from "@/models/InventoryPurchase";
import { apiResponse, apiError } from "@/lib/api";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return apiError("Unauthorized", 401);

  const { id } = await params;
  await connectDB();

  const purchase = await InventoryPurchase.findOne({ _id: id, tenantId }).lean();
  if (!purchase) return apiError("Not found", 404);

  return apiResponse({ purchase });
}
