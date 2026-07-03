import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import MedicineDosage from "@/models/MedicineDosage";
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
      { unit: { $regex: search, $options: "i" } },
    ];

  const items = await MedicineDosage.find(query).sort({ category: 1 });
  return apiResponse(items);
}

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  const role = req.headers.get("x-user-role");
  if (!tenantId) return apiError("Unauthorized", 401);
  if (role === "VIEWER") return apiError("Insufficient permissions", 403);

  await connectDB();
  const { category, dosage, unit } = await req.json();
  if (!category?.trim()) return apiError("Category is required", 400);
  if (!dosage?.trim()) return apiError("Dosage is required", 400);

  const item = await MedicineDosage.create({
    tenantId,
    category: category.trim(),
    dosage: dosage.trim(),
    unit: unit?.trim() ?? "",
  });
  return apiResponse(item, 201);
}
