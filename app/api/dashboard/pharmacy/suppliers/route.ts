import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Supplier from "@/models/Supplier";
import { apiResponse, apiError } from "@/lib/api";

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return apiError("Unauthorized", 401);

  await connectDB();
  const search = req.nextUrl.searchParams.get("search") ?? "";
  const query: Record<string, unknown> = { tenantId };
  if (search) query.name = { $regex: search, $options: "i" };

  const suppliers = await Supplier.find(query).sort({ name: 1 });
  return apiResponse(suppliers);
}

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  const role = req.headers.get("x-user-role");
  if (!tenantId) return apiError("Unauthorized", 401);
  if (role === "VIEWER") return apiError("Insufficient permissions", 403);

  await connectDB();
  const {
    name,
    contact,
    contactPersonName,
    contactPersonPhone,
    drugLicenseNumber,
    address,
  } = await req.json();
  if (!name?.trim()) return apiError("Supplier name is required", 400);

  const supplier = await Supplier.create({
    tenantId,
    name: name.trim(),
    contact: contact?.trim() ?? "",
    contactPersonName: contactPersonName?.trim() ?? "",
    contactPersonPhone: contactPersonPhone?.trim() ?? "",
    drugLicenseNumber: drugLicenseNumber?.trim() ?? "",
    address: address?.trim() ?? "",
  });
  return apiResponse(supplier, 201);
}
