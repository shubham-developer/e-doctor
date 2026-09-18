import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Bed from "@/models/Bed";
import { apiResponse, apiError } from "@/lib/api";

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  const branchId = req.headers.get("x-branch-id") ?? undefined;
  if (!tenantId) return apiError("Unauthorized", 401);

  await connectDB();

  const sp = req.nextUrl.searchParams;
  const bedGroup = sp.get("bedGroup") ?? "";
  const status = sp.get("status") ?? "";
  const search = sp.get("search") ?? "";

  const query: Record<string, unknown> = { tenantId, branchId };
  if (bedGroup) query.bedGroup = bedGroup;
  if (status) query.status = status;
  if (search) query.name = { $regex: search, $options: "i" };

  const beds = await Bed.find(query).sort({ bedGroup: 1, name: 1 });
  return apiResponse({ beds });
}

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  const branchId = req.headers.get("x-branch-id") ?? undefined;
  const role = req.headers.get("x-user-role");
  if (!tenantId) return apiError("Unauthorized", 401);
  if (role === "VIEWER") return apiError("Insufficient permissions", 403);

  await connectDB();
  const body = await req.json();
  const { name, bedType, bedGroup, floor, status, dailyCharge } = body;

  if (!name?.trim()) return apiError("Bed name is required", 400);

  const exists = await Bed.findOne({ tenantId, branchId, name: name.trim() });
  if (exists) return apiError("A bed with this name already exists", 409);

  const bed = await Bed.create({
    tenantId,
    branchId,
    name: name.trim(),
    bedType: bedType?.trim() ?? "",
    bedGroup: bedGroup?.trim() ?? "",
    floor: floor?.trim() ?? "",
    dailyCharge: Number(dailyCharge) || 0,
    status: status ?? "available",
  });
  return apiResponse(bed, 201);
}
