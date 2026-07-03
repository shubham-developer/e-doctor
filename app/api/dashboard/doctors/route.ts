import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Staff from "@/models/Staff";
import { apiResponse, apiError } from "@/lib/api";

// Read-only endpoint — returns Staff members with role=Doctor so OPD/Appointments/Patients
// doctor dropdowns keep working without a separate Doctor model.
export async function GET(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return apiError("Unauthorized", 401);
  await connectDB();
  const doctors = await Staff.find({
    tenantId,
    role: "Doctor",
    status: "active",
  })
    .select("name designation")
    .sort({ name: 1 })
    .limit(500);
  // Shape: { _id, name, specialization } — map designation → specialization for UI compat
  const result = doctors.map((d) => ({
    _id: d._id,
    name: d.name,
    specialization: d.designation ?? "",
  }));
  return apiResponse(result);
}
