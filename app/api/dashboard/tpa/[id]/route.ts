import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Tpa from "@/models/Tpa";
import { apiResponse, apiError } from "@/lib/api";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenantId = req.headers.get("x-tenant-id");
  const role = req.headers.get("x-user-role");
  if (!tenantId) return apiError("Unauthorized", 401);
  if (role === "VIEWER") return apiError("Insufficient permissions", 403);

  const { id } = await params;
  await connectDB();
  const body = await req.json();
  const { name, code, type, contactPerson, phone, email, address, empanelmentNo, isActive } = body;

  if (!name?.trim()) return apiError("TPA name is required", 400);

  const duplicate = await Tpa.findOne({ tenantId, code: code?.trim().toUpperCase(), _id: { $ne: id } });
  if (duplicate) return apiError("TPA code already exists", 409);

  const tpa = await Tpa.findOneAndUpdate(
    { _id: id, tenantId },
    {
      name: name.trim(),
      code: code?.trim().toUpperCase(),
      type: type || "PRIVATE",
      contactPerson: contactPerson?.trim(),
      phone: phone?.trim(),
      email: email?.trim(),
      address: address?.trim(),
      empanelmentNo: empanelmentNo?.trim(),
      isActive: isActive !== false,
    },
    { new: true },
  );
  if (!tpa) return apiError("TPA not found", 404);
  return apiResponse(tpa);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenantId = req.headers.get("x-tenant-id");
  const role = req.headers.get("x-user-role");
  if (!tenantId) return apiError("Unauthorized", 401);
  if (role === "VIEWER") return apiError("Insufficient permissions", 403);

  const { id } = await params;
  await connectDB();
  const tpa = await Tpa.findOneAndDelete({ _id: id, tenantId });
  if (!tpa) return apiError("TPA not found", 404);
  return apiResponse({ deleted: true });
}
