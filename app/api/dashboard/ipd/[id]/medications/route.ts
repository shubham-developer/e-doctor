import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import IpdMedication from "@/models/IpdMedication";
import IpdCharge from "@/models/IpdCharge";
import IpdAdmission from "@/models/IpdAdmission";
import Medicine from "@/models/Medicine";
import { apiResponse, apiError } from "@/lib/api";
import { todayString } from "@/lib/format";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const tenantId = req.headers.get("x-tenant-id");
  const branchId = req.headers.get("x-branch-id") ?? undefined;
  if (!tenantId) return apiError("Unauthorized", 401);

  const { id } = await params;
  await connectDB();

  const medications = await IpdMedication.find({
    tenantId,
    branchId,
    ipdId: id,
  }).sort({
    createdAt: 1,
  });
  return apiResponse(medications);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const tenantId = req.headers.get("x-tenant-id");
  const branchId = req.headers.get("x-branch-id") ?? undefined;
  const role = req.headers.get("x-user-role");
  const userName = req.headers.get("x-user-name") ?? "";
  if (!tenantId) return apiError("Unauthorized", 401);
  if (role === "VIEWER") return apiError("Insufficient permissions", 403);

  const { id } = await params;
  await connectDB();

  const admission = await IpdAdmission.findOne({ _id: id, tenantId, branchId });
  if (!admission) return apiError("IPD admission not found", 404);

  const body = await req.json();
  const { medicineId, medicineName, quantity, unitPrice, note, date } = body;

  if (!medicineName?.trim()) return apiError("Medicine name is required", 400);
  if (!unitPrice || Number(unitPrice) < 0)
    return apiError("Unit price is required", 400);

  const qty = Math.max(1, Number(quantity) || 1);
  const price = Number(unitPrice);
  const total = qty * price;
  const d = date || todayString();

  // Verify medicine exists if medicineId provided
  const medicine = medicineId
    ? await Medicine.findOne({ _id: medicineId, tenantId })
    : null;

  // Create the charge first
  const charge = await IpdCharge.create({
    tenantId,
    branchId,
    ipdId: id,
    categoryName: `Medicine: ${medicineName.trim()}`,
    quantity: qty,
    unitPrice: price,
    total,
    date: d,
    note: note?.trim() || undefined,
    addedByName: userName,
  });

  // Create the medication record linked to the charge
  const medication = await IpdMedication.create({
    tenantId,
    branchId,
    ipdId: id,
    medicineId: medicine?._id ?? undefined,
    medicineName: medicineName.trim(),
    quantity: qty,
    unitPrice: price,
    total,
    date: d,
    note: note?.trim() || undefined,
    addedByName: userName,
    chargeId: charge._id,
  });

  return apiResponse({ medication, charge }, 201);
}
