import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import StaffAttendance from "@/models/StaffAttendance";
import { apiResponse, apiError } from "@/lib/api";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return apiError("Unauthorized", 401);

  const { id } = await params;
  await connectDB();
  const body = await req.json();

  const record = await StaffAttendance.findOneAndUpdate(
    { _id: id, tenantId },
    {
      status: body.status,
      checkIn: body.checkIn ?? "",
      checkOut: body.checkOut ?? "",
      notes: body.notes ?? "",
    },
    { new: true }
  );
  if (!record) return apiError("Not found", 404);

  return apiResponse({ record });
}
