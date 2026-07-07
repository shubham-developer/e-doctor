import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Tpa from "@/models/Tpa";
import { apiResponse, apiError } from "@/lib/api";

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return apiError("Unauthorized", 401);
  await connectDB();
  const tpas = await Tpa.find({ tenantId }).sort({ name: 1 }).lean();
  return apiResponse(tpas);
}

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  const role = req.headers.get("x-user-role");
  if (!tenantId) return apiError("Unauthorized", 401);
  if (role === "VIEWER") return apiError("Insufficient permissions", 403);

  await connectDB();
  const body = await req.json();
  const { name, code, type, contactPerson, phone, email, address, empanelmentNo } = body;

  if (!name?.trim()) return apiError("TPA name is required", 400);
  if (!code?.trim()) return apiError("TPA code is required", 400);

  const exists = await Tpa.findOne({ tenantId, code: code.trim().toUpperCase() });
  if (exists) return apiError("TPA code already exists", 409);

  const tpa = await Tpa.create({
    tenantId,
    name: name.trim(),
    code: code.trim().toUpperCase(),
    type: type || "PRIVATE",
    contactPerson: contactPerson?.trim(),
    phone: phone?.trim(),
    email: email?.trim(),
    address: address?.trim(),
    empanelmentNo: empanelmentNo?.trim(),
    isActive: true,
  });

  return apiResponse(tpa, 201);
}
