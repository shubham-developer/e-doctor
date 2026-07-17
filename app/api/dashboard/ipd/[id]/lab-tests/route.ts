import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import IpdLabTest from "@/models/IpdLabTest";
import IpdCharge from "@/models/IpdCharge";
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

  const tests = await IpdLabTest.find({ tenantId, branchId, ipdId: id }).sort({
    createdAt: 1,
  });
  return apiResponse(tests);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const tenantId = req.headers.get("x-tenant-id");
  const branchId = req.headers.get("x-branch-id") ?? undefined;
  const userName = req.headers.get("x-user-name");
  const role = req.headers.get("x-user-role");
  if (!tenantId) return apiError("Unauthorized", 401);
  if (role === "VIEWER") return apiError("Insufficient permissions", 403);

  const { id } = await params;
  await connectDB();

  const body = await req.json();
  const { testId, testName, categoryName, amount, date, note } = body;

  if (!testName?.trim()) return apiError("Test name is required", 400);
  if (amount == null || Number(amount) < 0)
    return apiError("Amount is required", 400);

  // Create the charge first
  const charge = await IpdCharge.create({
    tenantId,
    branchId,
    ipdId: id,
    categoryName: `Lab: ${testName.trim()}`,
    quantity: 1,
    unitPrice: Number(amount),
    total: Number(amount),
    date: date || todayString(),
    note: note?.trim() || undefined,
    addedByName: userName ?? undefined,
  });

  // Create the lab test record linked to the charge
  try {
    const labTest = await IpdLabTest.create({
      tenantId,
      branchId,
      ipdId: id,
      testId: testId || undefined,
      testName: testName.trim(),
      categoryName: categoryName?.trim() || undefined,
      amount: Number(amount),
      date: date || todayString(),
      note: note?.trim() || undefined,
      chargeId: charge._id,
      addedByName: userName ?? undefined,
    });
    return apiResponse(labTest, 201);
  } catch (err) {
    // Compensating write: remove the charge if lab test creation failed
    await IpdCharge.findByIdAndDelete(charge._id);
    throw err;
  }
}
