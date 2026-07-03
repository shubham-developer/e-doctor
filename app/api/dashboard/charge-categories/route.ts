import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import ChargeCategory from "@/models/ChargeCategory";
import ChargeType from "@/models/ChargeType";
import { apiResponse, apiError } from "@/lib/api";

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return apiError("Unauthorized", 401);

  const moduleFilter = req.nextUrl.searchParams.get("module");

  await connectDB();

  const filter: Record<string, unknown> = { tenantId };
  if (moduleFilter) {
    filter.appliesTo = moduleFilter;
  }

  // lean() returns plain JS objects from MongoDB — bypasses Mongoose schema strict
  // so appliesTo always comes through regardless of model cache state
  const items = await ChargeCategory.find(filter)
    .sort({ sortOrder: 1, createdAt: 1 })
    .lean();

  // Auto-migrate any legacy categories that still lack appliesTo
  const needsMigration = items.filter(
    (i) => !i.appliesTo || (i.appliesTo as string[]).length === 0,
  );
  if (needsMigration.length > 0) {
    const typeIds = needsMigration
      .filter((i) => i.chargeTypeId)
      .map((i) => i.chargeTypeId);
    if (typeIds.length > 0) {
      const types = await ChargeType.find({ _id: { $in: typeIds } }).lean();
      const typeMap = new Map(
        types.map((t) => [String(t._id), (t as Record<string, unknown>).applicableModules as string[]]),
      );
      for (const item of needsMigration) {
        const mods = typeMap.get(String(item.chargeTypeId)) ?? [];
        if (mods.length > 0) {
          await ChargeCategory.updateOne(
            { _id: item._id },
            { $set: { appliesTo: mods } },
          );
          (item as Record<string, unknown>).appliesTo = mods;
        }
      }
    }
  }

  // Normalize shape
  const result = items.map((item) => ({
    ...item,
    _id: String(item._id),
    chargeTypeId: null,
    chargeTypeName: null,
    appliesTo: (item.appliesTo as string[] | undefined) ?? [],
  }));

  return apiResponse(result);
}

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  const role = req.headers.get("x-user-role");
  if (!tenantId) return apiError("Unauthorized", 401);
  if (role === "VIEWER") return apiError("Insufficient permissions", 403);

  await connectDB();
  const { name, description, appliesTo } = await req.json();
  if (!name?.trim()) return apiError("Name is required", 400);

  const count = await ChargeCategory.countDocuments({ tenantId });
  const item = await ChargeCategory.create({
    tenantId,
    name: name.trim(),
    description: description?.trim() || undefined,
    appliesTo: Array.isArray(appliesTo) ? appliesTo : [],
    sortOrder: count,
  });

  return apiResponse(item.toObject());
}
