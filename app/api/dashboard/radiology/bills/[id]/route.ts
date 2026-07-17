import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import RadiologyBill from "@/models/RadiologyBill";
import { apiResponse, apiError } from "@/lib/api";
import { logActivity } from "@/lib/activityLog";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const tenantId = req.headers.get("x-tenant-id");
  const branchId = req.headers.get("x-branch-id") ?? undefined;
  const role = req.headers.get("x-user-role");
  if (!tenantId) return apiError("Unauthorized", 401);
  if (role === "VIEWER") return apiError("Insufficient permissions", 403);

  const { id } = await params;
  await connectDB();

  const { amount, paymentMode } = await req.json();
  const amt = Number(amount) || 0;
  if (amt <= 0) return apiError("Payment amount must be greater than 0", 400);

  const bill = await RadiologyBill.findOne({ _id: id, tenantId, branchId });
  if (!bill) return apiError("Bill not found", 404);

  if (amt > bill.balance)
    return apiError(`Exceeds balance due (${bill.balance.toFixed(2)})`, 400);

  bill.paidAmount += amt;
  bill.balance -= amt;
  if (paymentMode) bill.paymentMode = paymentMode;
  await bill.save();

  logActivity(req, {
    action: "update",
    module: "radiology",
    description: `Recorded payment of ${amt} on radiology bill ${bill.billNo}`,
    link: "/radiology",
  });

  return apiResponse(bill);
}
