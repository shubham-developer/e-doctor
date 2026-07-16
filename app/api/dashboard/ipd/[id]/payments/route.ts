import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import IpdPayment from "@/models/IpdPayment";
import IpdAdmission from "@/models/IpdAdmission";
import { apiResponse, apiError } from "@/lib/api";
import { logActivity } from "@/lib/activityLog";
import { todayString } from "@/lib/format";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return apiError("Unauthorized", 401);

  const { id } = await params;
  await connectDB();

  const payments = await IpdPayment.find({ tenantId, ipdId: id }).sort({
    createdAt: 1,
  });
  return apiResponse(payments);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const tenantId = req.headers.get("x-tenant-id");
  const role = req.headers.get("x-user-role");
  const userName = req.headers.get("x-user-name") ?? "";
  if (!tenantId) return apiError("Unauthorized", 401);
  if (role === "VIEWER") return apiError("Insufficient permissions", 403);

  const { id } = await params;
  await connectDB();

  const admission = await IpdAdmission.findOne({ _id: id, tenantId });
  if (!admission) return apiError("IPD admission not found", 404);

  const body = await req.json();
  const { amount, paymentMode, note, date } = body;

  if (!amount || Number(amount) <= 0)
    return apiError("Amount must be greater than 0", 400);

  const payment = await IpdPayment.create({
    tenantId,
    ipdId: id,
    amount: Number(amount),
    paymentMode: paymentMode || "Cash",
    note: note?.trim() || undefined,
    date: date || todayString(),
    addedByName: userName,
  });

  logActivity(req, {
    action: "create",
    module: "ipd",
    description: `Recorded payment of ${Number(amount)} for IPD admission #${admission.ipdNumber}`,
    link: `/ipd/${id}`,
  });

  return apiResponse(payment, 201);
}
