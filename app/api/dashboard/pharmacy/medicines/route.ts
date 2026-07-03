import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Medicine from "@/models/Medicine";
import { apiResponse, apiError } from "@/lib/api";

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return apiError("Unauthorized", 401);

  await connectDB();

  const search = req.nextUrl.searchParams.get("search") ?? "";
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? "1"));
  const limit = Math.min(
    200,
    Math.max(1, Number(req.nextUrl.searchParams.get("limit") ?? "100")),
  );

  const query: Record<string, unknown> = { tenantId };
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { category: { $regex: search, $options: "i" } },
      { company: { $regex: search, $options: "i" } },
    ];
  }

  const [medicines, total] = await Promise.all([
    Medicine.find(query)
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Medicine.countDocuments(query),
  ]);

  return apiResponse({
    medicines,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  const role = req.headers.get("x-user-role");
  if (!tenantId) return apiError("Unauthorized", 401);
  if (role === "VIEWER") return apiError("Insufficient permissions", 403);

  await connectDB();
  const body = await req.json();
  const {
    name,
    company,
    composition,
    category,
    group,
    unit,
    availableQty,
    salePrice,
    taxPercent,
    batchNo,
    expiryDate,
    reorderLevel,
  } = body;

  if (!name?.trim()) return apiError("Medicine name is required", 400);

  const medicine = await Medicine.create({
    tenantId,
    name: name.trim(),
    ...(company?.trim() && { company: company.trim() }),
    ...(composition?.trim() && { composition: composition.trim() }),
    ...(category?.trim() && { category: category.trim() }),
    ...(group?.trim() && { group: group.trim() }),
    ...(unit?.trim() && { unit: unit.trim() }),
    availableQty: Number(availableQty) || 0,
    salePrice: Number(salePrice) || 0,
    taxPercent: Number(taxPercent) || 0,
    reorderLevel: Number(reorderLevel) || 10,
    ...(batchNo?.trim() && { batchNo: batchNo.trim() }),
    ...(expiryDate?.trim() && { expiryDate: expiryDate.trim() }),
  });

  return apiResponse(medicine, 201);
}

export async function DELETE(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  const role = req.headers.get("x-user-role");
  if (!tenantId) return apiError("Unauthorized", 401);
  if (role === "VIEWER") return apiError("Insufficient permissions", 403);

  await connectDB();
  const { ids } = await req.json();
  if (!Array.isArray(ids) || ids.length === 0)
    return apiError("ids array is required", 400);

  const result = await Medicine.deleteMany({ _id: { $in: ids }, tenantId });
  return apiResponse({ deleted: result.deletedCount });
}

export async function PATCH(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  const role = req.headers.get("x-user-role");
  if (!tenantId) return apiError("Unauthorized", 401);
  if (role === "VIEWER") return apiError("Insufficient permissions", 403);

  await connectDB();
  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return apiError("Medicine id is required", 400);

  const medicine = await Medicine.findOneAndUpdate(
    { _id: id, tenantId },
    { $set: updates },
    { new: true },
  );
  if (!medicine) return apiError("Medicine not found", 404);
  return apiResponse(medicine);
}
