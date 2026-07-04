import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import InventoryVendor from "@/models/InventoryVendor";
import { apiResponse, apiError } from "@/lib/api";

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return apiError("Unauthorized", 401);

  await connectDB();

  const search = req.nextUrl.searchParams.get("search") ?? "";
  const query: Record<string, unknown> = { tenantId };
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { contactPerson: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
    ];
  }

  const vendors = await InventoryVendor.find(query).sort({ name: 1 }).lean();
  return apiResponse({ vendors, total: vendors.length });
}

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return apiError("Unauthorized", 401);

  await connectDB();
  const body = await req.json();

  if (!body.name?.trim()) return apiError("Vendor name is required", 400);

  const vendor = await InventoryVendor.create({
    tenantId,
    name: body.name.trim(),
    contactPerson: body.contactPerson?.trim() ?? "",
    phone: body.phone?.trim() ?? "",
    email: body.email?.trim() ?? "",
    address: body.address?.trim() ?? "",
    gstin: body.gstin?.trim() ?? "",
  });

  return apiResponse({ vendor }, 201);
}
