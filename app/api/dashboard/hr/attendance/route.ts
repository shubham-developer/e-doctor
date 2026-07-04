import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import StaffAttendance from "@/models/StaffAttendance";
import Staff from "@/models/Staff";
import { apiResponse, apiError } from "@/lib/api";

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return apiError("Unauthorized", 401);

  await connectDB();

  const dateParam  = req.nextUrl.searchParams.get("date");  // "YYYY-MM-DD" — single day
  const monthParam = req.nextUrl.searchParams.get("month"); // "YYYY-MM"    — full month

  const activeStaff = await Staff.find({ tenantId, status: "active" })
    .select("_id name staffCode department role")
    .lean();

  // ── Single-day mode ──────────────────────────────────────────────────────────
  if (dateParam) {
    const day = new Date(dateParam);
    day.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(dateParam);
    dayEnd.setUTCHours(23, 59, 59, 999);

    const records = await StaffAttendance.find({
      tenantId,
      date: { $gte: day, $lte: dayEnd },
    }).lean();

    const statusMap: Record<string, string> = {};
    for (const r of records) {
      statusMap[String(r.staffId)] = r.status;
    }

    const staffWithStatus = activeStaff.map((s) => ({
      ...s,
      todayStatus: statusMap[String(s._id)] ?? null,
    }));

    const summary = {
      present:   records.filter((r) => r.status === "present").length,
      absent:    records.filter((r) => r.status === "absent").length,
      halfDay:   records.filter((r) => r.status === "half_day").length,
      onLeave:   records.filter((r) => r.status === "leave").length,
      notMarked: activeStaff.length - records.length,
    };

    return apiResponse({ staff: staffWithStatus, summary, date: dateParam });
  }

  // ── Month mode ───────────────────────────────────────────────────────────────
  if (!monthParam) return apiError("month or date param required", 400);

  const [y, m] = monthParam.split("-").map(Number);
  const from = new Date(y, m - 1, 1);
  const to   = new Date(y, m, 0, 23, 59, 59, 999);

  const records = await StaffAttendance.find({ tenantId, date: { $gte: from, $lte: to } }).lean();

  const summary = {
    presentDays: records.filter((r) => r.status === "present").length,
    absentDays:  records.filter((r) => r.status === "absent").length,
    halfDays:    records.filter((r) => r.status === "half_day").length,
    leaveDays:   records.filter((r) => r.status === "leave").length,
  };

  return apiResponse({ records, staff: activeStaff, summary });
}

// Bulk mark attendance for a given date
export async function POST(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  const createdBy = req.headers.get("x-user-name") ?? "";
  if (!tenantId) return apiError("Unauthorized", 401);

  await connectDB();
  const { date, entries } = await req.json();
  // entries: [{ staffId, status, checkIn?, checkOut?, notes? }]

  if (!date || !Array.isArray(entries) || entries.length === 0) {
    return apiError("date and entries are required", 400);
  }

  const dayDate = new Date(date);
  dayDate.setUTCHours(0, 0, 0, 0);

  const ops = entries.map((e: { staffId: string; staffName: string; staffCode: number; status: string; checkIn?: string; checkOut?: string; notes?: string }) => ({
    updateOne: {
      filter: { tenantId, staffId: e.staffId, date: dayDate },
      update: {
        $set: {
          tenantId,
          staffId: e.staffId,
          staffName: e.staffName,
          staffCode: e.staffCode,
          date: dayDate,
          status: e.status,
          checkIn: e.checkIn ?? "",
          checkOut: e.checkOut ?? "",
          notes: e.notes ?? "",
          createdBy,
        },
      },
      upsert: true,
    },
  }));

  await StaffAttendance.bulkWrite(ops);
  return apiResponse({ saved: entries.length });
}
