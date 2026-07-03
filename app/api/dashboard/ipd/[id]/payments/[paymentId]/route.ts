import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import IpdPayment from "@/models/IpdPayment";
import { apiResponse, apiError } from "@/lib/api";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; paymentId: string }> },
) {
  const tenantId = req.headers.get("x-tenant-id");
  const role = req.headers.get("x-user-role");
  if (!tenantId) return apiError("Unauthorized", 401);
  if (role === "VIEWER") return apiError("Insufficient permissions", 403);

  const { id, paymentId } = await params;
  await connectDB();

  const body = await req.json();
  const amount = Number(body.amount);
  if (amount <= 0) return apiError("Amount must be greater than 0", 400);

  const payment = await IpdPayment.findOneAndUpdate(
    { _id: paymentId, ipdId: id, tenantId },
    { $set: { ...body, amount } },
    { new: true },
  );

  if (!payment) return apiError("Payment not found", 404);
  return apiResponse(payment);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; paymentId: string }> },
) {
  const tenantId = req.headers.get("x-tenant-id");
  const role = req.headers.get("x-user-role");
  if (!tenantId) return apiError("Unauthorized", 401);
  if (role === "VIEWER") return apiError("Insufficient permissions", 403);

  const { id, paymentId } = await params;
  await connectDB();

  const payment = await IpdPayment.findOneAndDelete({
    _id: paymentId,
    ipdId: id,
    tenantId,
  });
  if (!payment) return apiError("Payment not found", 404);
  return apiResponse({ deleted: true });
}
