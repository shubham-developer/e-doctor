import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import BadStock from "@/models/BadStock";
import Medicine from "@/models/Medicine";
import { apiResponse, apiError } from "@/lib/api";
import { format } from "date-fns";

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return apiError("Unauthorized", 401);
  await connectDB();

  const search = req.nextUrl.searchParams.get("search") ?? "";
  const query: Record<string, unknown> = { tenantId };
  if (search) query.medicineName = { $regex: search, $options: "i" };

  const items = await BadStock.find(query).sort({ createdAt: -1 }).limit(200);
  return apiResponse(items);
}

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  const role = req.headers.get("x-user-role");
  if (!tenantId) return apiError("Unauthorized", 401);
  if (role === "VIEWER") return apiError("Insufficient permissions", 403);

  await connectDB();
  const { medicineId, batchNo, expiryDate, outwardDate, note } =
    await req.json();
  if (!medicineId) return apiError("Medicine is required", 400);
  if (!outwardDate) return apiError("Outward date is required", 400);

  const medicine = await Medicine.findOne({ _id: medicineId, tenantId });
  if (!medicine) return apiError("Medicine not found", 404);

  const item = await BadStock.create({
    tenantId,
    medicineId,
    medicineName: medicine.name,
    batchNo: batchNo ?? medicine.batchNo ?? "",
    expiryDate: expiryDate ?? medicine.expiryDate ?? "",
    outwardDate: outwardDate ?? format(new Date(), "yyyy-MM-dd"),
    note: note ?? "",
  });

  return apiResponse(item, 201);
}
