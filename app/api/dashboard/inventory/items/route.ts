import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import InventoryItem from "@/models/InventoryItem";
import InventoryCategory from "@/models/InventoryCategory";
import { apiResponse, apiError } from "@/lib/api";

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return apiError("Unauthorized", 401);

  await connectDB();

  const search = req.nextUrl.searchParams.get("search") ?? "";
  const categoryId = req.nextUrl.searchParams.get("categoryId") ?? "";
  const lowStock = req.nextUrl.searchParams.get("lowStock") === "true";
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? "1"));
  const limit = Math.min(200, Math.max(1, Number(req.nextUrl.searchParams.get("limit") ?? "50")));

  const query: Record<string, unknown> = { tenantId };
  if (search) query.name = { $regex: search, $options: "i" };
  if (categoryId) query.categoryId = categoryId;
  if (lowStock) query.$expr = { $lte: ["$currentStock", "$reorderLevel"] };

  const [items, total] = await Promise.all([
    InventoryItem.find(query)
      .populate("categoryId", "name")
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    InventoryItem.countDocuments(query),
  ]);

  // Ensure InventoryCategory model is registered for populate
  void InventoryCategory;

  return apiResponse({ items, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  const createdBy = req.headers.get("x-user-name") ?? "";
  if (!tenantId) return apiError("Unauthorized", 401);

  await connectDB();
  const body = await req.json();

  if (!body.name?.trim()) return apiError("Name is required", 400);
  if (!body.categoryId) return apiError("Category is required", 400);

  const item = await InventoryItem.create({
    tenantId,
    name: body.name.trim(),
    categoryId: body.categoryId,
    unit: body.unit?.trim() || "Pcs",
    currentStock: Number(body.currentStock ?? 0),
    reorderLevel: Number(body.reorderLevel ?? 0),
    maxStock: Number(body.maxStock ?? 0),
    unitCost: Number(body.unitCost ?? 0),
    location: body.location?.trim() ?? "",
    description: body.description?.trim() ?? "",
    isActive: true,
  });

  void createdBy;
  return apiResponse({ item }, 201);
}
