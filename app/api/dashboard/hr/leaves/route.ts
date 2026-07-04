import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import StaffLeave from "@/models/StaffLeave";
import Staff from "@/models/Staff";
import { apiResponse, apiError } from "@/lib/api";

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return apiError("Unauthorized", 401);

  await connectDB();

  const status = req.nextUrl.searchParams.get("status") ?? "";
  const staffId = req.nextUrl.searchParams.get("staffId") ?? "";
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? "1"));
  const limit = Math.min(50, Math.max(1, Number(req.nextUrl.searchParams.get("limit") ?? "20")));

  const query: Record<string, unknown> = { tenantId };
  if (status) query.status = status;
  if (staffId) query.staffId = staffId;

  const [leaves, total, allStaff] = await Promise.all([
    StaffLeave.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    StaffLeave.countDocuments(query),
    Staff.find({ tenantId, status: "active" }).select("_id name staffCode department").lean(),
  ]);

  const pendingCount = await StaffLeave.countDocuments({ tenantId, status: "pending" });

  return apiResponse({ leaves, total, page, totalPages: Math.ceil(total / limit), pendingCount, staff: allStaff });
}

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  const createdBy = req.headers.get("x-user-name") ?? "";
  if (!tenantId) return apiError("Unauthorized", 401);

  await connectDB();
  const body = await req.json();

  if (!body.staffId) return apiError("Staff is required", 400);
  if (!body.fromDate || !body.toDate) return apiError("From and To dates required", 400);
  if (!body.leaveType) return apiError("Leave type is required", 400);

  const staff = await Staff.findOne({ _id: body.staffId, tenantId });
  if (!staff) return apiError("Staff not found", 404);

  const from = new Date(body.fromDate);
  const to = new Date(body.toDate);
  if (to < from) return apiError("To date must be on or after From date", 400);

  // Calculate working days (exclude Sundays)
  let days = 0;
  const d = new Date(from);
  while (d <= to) {
    if (d.getDay() !== 0) days++; // exclude Sundays
    d.setDate(d.getDate() + 1);
  }

  const leave = await StaffLeave.create({
    tenantId,
    staffId: staff._id,
    staffName: staff.name,
    staffCode: staff.staffCode,
    department: staff.department ?? "",
    leaveType: body.leaveType,
    fromDate: from,
    toDate: to,
    days,
    reason: body.reason?.trim() ?? "",
    status: "pending",
    createdBy,
  });

  return apiResponse({ leave }, 201);
}
