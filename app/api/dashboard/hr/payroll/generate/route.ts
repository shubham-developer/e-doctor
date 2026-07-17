import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Payroll from "@/models/Payroll";
import Staff from "@/models/Staff";
import StaffAttendance from "@/models/StaffAttendance";
import { apiResponse, apiError } from "@/lib/api";

// Count non-Sunday days in a month (= calendar working days)
function workingDaysInMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  const total = new Date(y, m, 0).getDate();
  let count = 0;
  for (let d = 1; d <= total; d++) {
    if (new Date(y, m - 1, d).getDay() !== 0) count++;
  }
  return count;
}

function compute(
  basic: number,
  allowances: Record<string, number>,
  deductions: Record<string, number>,
  presentDays: number,
  workingDays: number,
) {
  const totalAllowances = Object.values(allowances).reduce((s, v) => s + v, 0);
  const grossSalary = workingDays > 0 ? ((basic + totalAllowances) / workingDays) * presentDays : 0;
  const totalDeductions = Object.values(deductions).reduce((s, v) => s + v, 0);
  const netSalary = Math.max(0, grossSalary - totalDeductions);
  return {
    grossSalary: Math.round(grossSalary * 100) / 100,
    totalDeductions,
    netSalary: Math.round(netSalary * 100) / 100,
  };
}

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  const branchId = req.headers.get("x-branch-id") ?? undefined;
  const createdBy = req.headers.get("x-user-name") ?? "";
  if (!tenantId) return apiError("Unauthorized", 401);

  await connectDB();
  const { month } = await req.json(); // "YYYY-MM"
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return apiError("Invalid month format (YYYY-MM)", 400);

  // Block re-generation
  const existing = await Payroll.countDocuments({ tenantId, month });
  if (existing > 0) return apiError(`Payroll for ${month} already generated (${existing} records). Edit individual entries.`, 400);

  const [y, m] = month.split("-").map(Number);
  const fromDate = new Date(y, m - 1, 1);
  const toDate   = new Date(y, m, 0, 23, 59, 59, 999);
  const workingDays = workingDaysInMonth(month);

  const [activeStaff, attendanceRecords] = await Promise.all([
    Staff.find({ tenantId, status: "active" }).lean(),
    StaffAttendance.find({ tenantId, date: { $gte: fromDate, $lte: toDate } }).lean(),
  ]);

  if (activeStaff.length === 0) return apiError("No active staff found", 400);

  // Group attendance by staffId
  const attMap = new Map<string, { present: number; absent: number; halfDay: number; leave: number; holiday: number }>();
  for (const r of attendanceRecords) {
    const key = String(r.staffId);
    if (!attMap.has(key)) attMap.set(key, { present: 0, absent: 0, halfDay: 0, leave: 0, holiday: 0 });
    const bucket = attMap.get(key)!;
    if (r.status === "present")        bucket.present++;
    else if (r.status === "absent")    bucket.absent++;
    else if (r.status === "half_day")  bucket.halfDay++;
    else if (r.status === "leave")     bucket.leave++;
    else if (r.status === "holiday")   bucket.holiday++;
  }

  const docs = activeStaff.map((s) => {
    const basic = s.salary ?? 0;
    const allowances = { hra: 0, da: 0, medical: 0, transport: 0, other: 0 };
    const deductions  = { pf: 0, esi: 0, tds: 0, advance: 0, other: 0 };

    const att = attMap.get(String(s._id));
    let presentDays: number;
    let absentDays = 0;
    let leaveDays  = 0;
    let halfDays   = 0;

    if (!att || (att.present + att.absent + att.halfDay + att.leave + att.holiday) === 0) {
      // No attendance filled → assume full attendance
      presentDays = workingDays;
    } else {
      // present + leave count as paid; half_day = 0.5; absent = deducted
      absentDays  = att.absent;
      leaveDays   = att.leave;
      halfDays    = att.halfDay;
      presentDays = att.present + (att.halfDay * 0.5) + att.leave;
      // holiday days don't reduce present days — they're effectively paid
      // cap presentDays to workingDays in case of data anomalies
      presentDays = Math.min(presentDays, workingDays);
    }

    const { grossSalary, totalDeductions, netSalary } = compute(basic, allowances, deductions, presentDays, workingDays);

    return {
      tenantId,
      branchId,
      staffId:   s._id,
      staffName: s.name,
      staffCode: s.staffCode,
      role:      s.role ?? "",
      department: s.department ?? "",
      month,
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
      paymentStatus: "pending",
      createdBy,
    };
  });

  await Payroll.insertMany(docs);

  return apiResponse({ generated: docs.length, month }, 201);
}
