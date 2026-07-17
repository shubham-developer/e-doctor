import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Tenant from "@/models/Tenant";
import TenantUser from "@/models/TenantUser";
import Doctor from "@/models/Doctor";
import Appointment from "@/models/Appointment";
import Patient from "@/models/Patient";
import Staff from "@/models/Staff";
import { apiResponse, apiError } from "@/lib/api";
import { ALL_MODULE_KEYS, CORE_MODULE_KEYS } from "@/lib/constants/modules";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminId = req.headers.get("x-admin-id");
  if (!adminId) return apiError("Unauthorized", 401);

  const { id } = await params;
  await connectDB();

  const tenant = await Tenant.findById(id).lean();
  if (!tenant) return apiError("Tenant not found", 404);

  const [users, doctorCount, appointmentCount, patientCount, staffCount] =
    await Promise.all([
      TenantUser.find({ tenantId: id })
        .select("name email role isActive createdAt")
        .lean(),
      Doctor.countDocuments({ tenantId: id }),
      Appointment.countDocuments({ tenantId: id }),
      Patient.countDocuments({ tenantId: id }),
      Staff.countDocuments({ tenantId: id }),
    ]);

  return apiResponse({
    tenant,
    users,
    doctorCount,
    appointmentCount,
    patientCount,
    staffCount,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminId = req.headers.get("x-admin-id");
  if (!adminId) return apiError("Unauthorized", 401);

  const { id } = await params;
  await connectDB();

  const body = await req.json();
  const allowed = [
    "name",
    "address",
    "plan",
    "planExpiresAt",
    "isActive",
    "brandColor",
  ];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  if ("enabledModules" in body) {
    if (!Array.isArray(body.enabledModules)) {
      return apiError("enabledModules must be an array", 400);
    }
    const modules = body.enabledModules.filter((k: unknown) =>
      ALL_MODULE_KEYS.includes(k as string),
    );
    for (const core of CORE_MODULE_KEYS) {
      if (!modules.includes(core)) modules.push(core);
    }
    update.enabledModules = modules;
  }

  const tenant = await Tenant.findByIdAndUpdate(id, update, { new: true });
  if (!tenant) return apiError("Tenant not found", 404);

  return apiResponse({ tenant });
}
