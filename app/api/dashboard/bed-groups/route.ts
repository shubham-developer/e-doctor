import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import BedGroup from "@/models/BedGroup";
import { apiResponse, apiError } from "@/lib/api";

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  const branchId = req.headers.get("x-branch-id") ?? undefined;
  if (!tenantId) return apiError("Unauthorized", 401);
  await connectDB();

  const search = req.nextUrl.searchParams.get("search") ?? "";
  const query: Record<string, unknown> = { tenantId, branchId };
  if (search) query.name = { $regex: search, $options: "i" };

  const items = await BedGroup.find(query).sort({ name: 1 });
  return apiResponse({ items });
}

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  const branchId = req.headers.get("x-branch-id") ?? undefined;
  const role = req.headers.get("x-user-role");
  if (!tenantId) return apiError("Unauthorized", 401);
  if (role === "VIEWER") return apiError("Insufficient permissions", 403);
  await connectDB();

  const { name, floor, description } = await req.json();
  if (!name?.trim()) return apiError("Name is required", 400);

  try {
    const item = await BedGroup.create({
      tenantId,
      branchId,
      name: name.trim(),
      ...(floor?.trim() && { floor: floor.trim() }),
      ...(description?.trim() && { description: description.trim() }),
    });
    return apiResponse(item, 201);
  } catch (e: unknown) {
    if ((e as { code?: number }).code === 11000)
      return apiError("Bed group already exists", 409);
    throw e;
  }
}
