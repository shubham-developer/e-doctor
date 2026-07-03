import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Charge, { ICharge } from "@/models/Charge";
import ChargeCategory from "@/models/ChargeCategory";
import ChargeType from "@/models/ChargeType";
import { apiResponse, apiError } from "@/lib/api";

function serialize(charge: ICharge) {
  const obj = charge.toObject() as Record<string, unknown>;
  const category = obj.chargeCategoryId as {
    _id: string;
    name: string;
  } | null;

  return {
    ...obj,
    chargeCategoryId: category?._id ?? null,
    chargeCategoryName: category?.name ?? null,
    chargeTypeName: null,
    unitTypeId: null,
    unitTypeName: null,
    taxCategoryId: null,
    taxCategoryName: null,
    taxPercent: null,
  };
}

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return apiError("Unauthorized", 401);

  const moduleFilter = req.nextUrl.searchParams.get("module");

  await connectDB();

  const filter: Record<string, unknown> = { tenantId };
  if (moduleFilter) {
    // New path: ChargeCategory.appliesTo contains the module
    const newCatIds = await ChargeCategory.find({
      tenantId,
      appliesTo: moduleFilter,
    }).distinct("_id");

    // Legacy path: categories linked to a ChargeType with applicableModules matching
    const legacyTypeIds = await ChargeType.find({
      tenantId,
      applicableModules: moduleFilter,
    }).distinct("_id");
    const legacyCatIds = await ChargeCategory.find({
      tenantId,
      chargeTypeId: { $in: legacyTypeIds },
    }).distinct("_id");

    const allIds = [
      ...new Set([...newCatIds.map(String), ...legacyCatIds.map(String)]),
    ];
    filter.chargeCategoryId = { $in: allIds };
  }

  const charges = await Charge.find(filter)
    .sort({ sortOrder: 1, createdAt: 1 })
    .populate("chargeCategoryId", "name");

  return apiResponse(charges.map(serialize));
}

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  const role = req.headers.get("x-user-role");
  if (!tenantId) return apiError("Unauthorized", 401);
  if (role === "VIEWER") return apiError("Insufficient permissions", 403);

  await connectDB();
  const { name, chargeCategoryId, standardCharge } = await req.json();
  if (!name?.trim()) return apiError("Name is required", 400);

  const count = await Charge.countDocuments({ tenantId });
  const charge = await Charge.create({
    tenantId,
    name: name.trim(),
    chargeCategoryId: chargeCategoryId || undefined,
    standardCharge: Number(standardCharge) || 0,
    sortOrder: count,
  });

  return apiResponse(charge, 201);
}
