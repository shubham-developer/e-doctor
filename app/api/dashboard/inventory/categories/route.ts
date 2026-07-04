import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import InventoryCategory from "@/models/InventoryCategory";
import { apiResponse, apiError } from "@/lib/api";

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return apiError("Unauthorized", 401);

  await connectDB();

  const search = req.nextUrl.searchParams.get("search") ?? "";
  const query: Record<string, unknown> = { tenantId };
  if (search) query.name = { $regex: search, $options: "i" };

  const categories = await InventoryCategory.find(query).sort({ name: 1 }).lean();
  return apiResponse({ categories, total: categories.length });
}

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return apiError("Unauthorized", 401);

  await connectDB();
  const body = await req.json();

  if (!body.name?.trim()) return apiError("Name is required", 400);

  const exists = await InventoryCategory.findOne({ tenantId, name: body.name.trim() });
  if (exists) return apiError("Category with this name already exists", 400);

  const category = await InventoryCategory.create({
    tenantId,
    name: body.name.trim(),
    description: body.description?.trim() ?? "",
  });

  return apiResponse({ category }, 201);
}
