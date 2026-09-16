import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import FindingMaster from "@/models/FindingMaster";
import { apiResponse, apiError } from "@/lib/api";

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return apiError("Unauthorized", 401);

  await connectDB();
  const search = req.nextUrl.searchParams.get("search") ?? "";
  const query: Record<string, unknown> = { tenantId };
  if (search)
    query.$or = [
      { category: { $regex: search, $options: "i" } },
      { list: { $regex: search, $options: "i" } },
    ];

  const items = await FindingMaster.find(query).sort({ category: 1 });
  return apiResponse(items);
}

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  const role = req.headers.get("x-user-role");
  if (!tenantId) return apiError("Unauthorized", 401);
  if (role === "VIEWER") return apiError("Insufficient permissions", 403);

  await connectDB();
  const { category, list } = await req.json();
  if (!category?.trim()) return apiError("Category is required", 400);
  if (!list?.trim()) return apiError("List is required", 400);

  const item = await FindingMaster.create({
    tenantId,
    category: category.trim(),
    list: list.trim(),
  });
  return apiResponse(item, 201);
}
