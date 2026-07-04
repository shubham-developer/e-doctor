import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Payroll from "@/models/Payroll";
import { apiResponse, apiError } from "@/lib/api";

function compute(basic: number, allowances: Record<string, number>, deductions: Record<string, number>, presentDays: number, workingDays: number) {
  const totalAllowances = Object.values(allowances).reduce((s, v) => s + v, 0);
  const grossSalary = ((basic + totalAllowances) / workingDays) * presentDays;
  const totalDeductions = Object.values(deductions).reduce((s, v) => s + v, 0);
  const netSalary = Math.max(0, grossSalary - totalDeductions);
  return {
    grossSalary: Math.round(grossSalary * 100) / 100,
    totalDeductions,
    netSalary: Math.round(netSalary * 100) / 100,
  };
}

// Update salary details / attendance / deductions
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return apiError("Unauthorized", 401);

  const { id } = await params;
  await connectDB();
  const body = await req.json();

  const basic = Number(body.basicSalary ?? 0);
  const allowances = {
    hra: Number(body.allowances?.hra ?? 0),
    da: Number(body.allowances?.da ?? 0),
    medical: Number(body.allowances?.medical ?? 0),
    transport: Number(body.allowances?.transport ?? 0),
    other: Number(body.allowances?.other ?? 0),
  };
  const deductions = {
    pf: Number(body.deductions?.pf ?? 0),
    esi: Number(body.deductions?.esi ?? 0),
    tds: Number(body.deductions?.tds ?? 0),
    advance: Number(body.deductions?.advance ?? 0),
    other: Number(body.deductions?.other ?? 0),
  };
  const workingDays = Number(body.workingDays ?? 26);
  const presentDays = Number(body.presentDays ?? workingDays);
  const absentDays  = Number(body.absentDays ?? 0);
  const leaveDays   = Number(body.leaveDays ?? 0);
  const halfDays    = Number(body.halfDays ?? 0);

  const { grossSalary, totalDeductions, netSalary } = compute(basic, allowances, deductions, presentDays, workingDays);

  const payroll = await Payroll.findOneAndUpdate(
    { _id: id, tenantId },
    {
      basicSalary: basic,
      allowances,
      deductions,
      workingDays,
      presentDays,
      absentDays,
      leaveDays,
      halfDays,
      grossSalary,
      totalDeductions,
      netSalary,
      notes: body.notes ?? "",
    },
    { new: true }
  );
  if (!payroll) return apiError("Not found", 404);

  return apiResponse({ payroll });
}

// Mark as paid / unpaid
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return apiError("Unauthorized", 401);

  const { id } = await params;
  await connectDB();
  const body = await req.json();

  const update: Record<string, unknown> =
    body.paymentStatus === "paid"
      ? {
          paymentStatus: "paid",
          paymentDate: body.paymentDate ? new Date(body.paymentDate) : new Date(),
          paymentMode: body.paymentMode ?? "cash",
          paymentRef: body.paymentRef ?? "",
        }
      : { paymentStatus: "pending", paymentDate: undefined, paymentMode: undefined, paymentRef: undefined };

  const payroll = await Payroll.findOneAndUpdate({ _id: id, tenantId }, update, { new: true });
  if (!payroll) return apiError("Not found", 404);

  return apiResponse({ payroll });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return apiError("Unauthorized", 401);

  const { id } = await params;
  await connectDB();

  // Only allow deletion if payroll is still pending
  const payroll = await Payroll.findOne({ _id: id, tenantId });
  if (!payroll) return apiError("Not found", 404);
  if (payroll.paymentStatus === "paid") return apiError("Cannot delete a paid payroll entry", 400);

  await payroll.deleteOne();
  return apiResponse({ message: "Deleted" });
}
