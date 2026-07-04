import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Payroll from "@/models/Payroll";
import { apiResponse, apiError } from "@/lib/api";

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return apiError("Unauthorized", 401);

  await connectDB();

  const month = req.nextUrl.searchParams.get("month"); // "YYYY-MM"
  if (!month) return apiError("month param required", 400);

  const payrolls = await Payroll.find({ tenantId, month })
    .sort({ staffName: 1 })
    .lean();

  const summary = {
    total: payrolls.length,
    paid: payrolls.filter((p) => p.paymentStatus === "paid").length,
    pending: payrolls.filter((p) => p.paymentStatus === "pending").length,
    totalNetSalary: payrolls.reduce((s, p) => s + p.netSalary, 0),
    totalPaid: payrolls.filter((p) => p.paymentStatus === "paid").reduce((s, p) => s + p.netSalary, 0),
  };

  return apiResponse({ payrolls, summary });
}
