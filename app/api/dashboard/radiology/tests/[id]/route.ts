import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import RadiologyTest, { IRadiologyTest } from "@/models/RadiologyTest";
import "@/models/Charge";
import { apiResponse, apiError } from "@/lib/api";

function serialize(test: IRadiologyTest) {
  const obj = test.toObject() as Record<string, unknown>;
  const charge = obj.chargeId as { _id: string; name: string } | null;
  return {
    ...obj,
    chargeId: charge?._id ?? null,
    chargeName: charge?.name ?? null,
  };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const tenantId = req.headers.get("x-tenant-id");
  const role = req.headers.get("x-user-role");
  if (!tenantId) return apiError("Unauthorized", 401);
  if (role === "VIEWER") return apiError("Insufficient permissions", 403);

  const { id } = await params;
  await connectDB();

  const body = await req.json();
  const {
    name,
    shortName,
    testType,
    chargeId,
    method,
    reportDays,
    tax,
    standardCharge,
    amount,
  } = body;

  if (name !== undefined && !name.trim())
    return apiError("Test name is required", 400);
  if (shortName !== undefined && !shortName.trim())
    return apiError("Short name is required", 400);

  const test = await RadiologyTest.findOneAndUpdate(
    { _id: id, tenantId },
    {
      $set: {
        ...(name !== undefined && { name: name.trim() }),
        ...(shortName !== undefined && { shortName: shortName.trim() }),
        ...(testType !== undefined && {
          testType: testType?.trim() || undefined,
        }),
        ...(chargeId !== undefined && { chargeId: chargeId || undefined }),
        ...(method !== undefined && { method: method?.trim() || undefined }),
        ...(reportDays !== undefined && { reportDays: Number(reportDays) }),
        ...(tax !== undefined && { tax: Number(tax) }),
        ...(standardCharge !== undefined && {
          standardCharge: Number(standardCharge),
        }),
        ...(amount !== undefined && { amount: Number(amount) }),
      },
    },
    { new: true },
  ).populate("chargeId", "name");

  if (!test) return apiError("Test not found", 404);
  return apiResponse(serialize(test));
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const tenantId = req.headers.get("x-tenant-id");
  const role = req.headers.get("x-user-role");
  if (!tenantId) return apiError("Unauthorized", 401);
  if (role === "VIEWER") return apiError("Insufficient permissions", 403);

  const { id } = await params;
  await connectDB();

  const test = await RadiologyTest.findOneAndDelete({ _id: id, tenantId });
  if (!test) return apiError("Test not found", 404);
  return apiResponse({ deleted: true });
}
