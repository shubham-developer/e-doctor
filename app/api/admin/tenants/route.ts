import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Tenant from "@/models/Tenant";
import TenantUser from "@/models/TenantUser";
import Doctor from "@/models/Doctor";
import Appointment from "@/models/Appointment";
import Patient from "@/models/Patient";
import Role from "@/models/Role";
import Staff from "@/models/Staff";
import Branch from "@/models/Branch";
import { apiResponse, apiError } from "@/lib/api";
import { MASTER_ROLES } from "@/lib/constants/masterRoles";

async function countByTenant(
  model: Pick<mongoose.Model<unknown>, "aggregate">,
  tenantIds: mongoose.Types.ObjectId[],
): Promise<Record<string, number>> {
  const rows: { _id: mongoose.Types.ObjectId; count: number }[] =
    await model.aggregate([
      { $match: { tenantId: { $in: tenantIds } } },
      { $group: { _id: "$tenantId", count: { $sum: 1 } } },
    ]);
  return Object.fromEntries(rows.map((r) => [r._id.toString(), r.count]));
}

export async function GET(req: NextRequest) {
  const adminId = req.headers.get("x-admin-id");
  if (!adminId) return apiError("Unauthorized", 401);

  await connectDB();

  const tenants = await Tenant.find({}).sort({ createdAt: -1 }).lean();

  const tenantIds = tenants.map((t) => t._id);

  // Fetch per-tenant counts in parallel
  const [userCountMap, apptCountMap, patientCountMap, doctorCountMap, staffCountMap] =
    await Promise.all([
      countByTenant(TenantUser, tenantIds),
      countByTenant(Appointment, tenantIds),
      countByTenant(Patient, tenantIds),
      countByTenant(Doctor, tenantIds),
      countByTenant(Staff, tenantIds),
    ]);

  const data = tenants.map((t) => ({
    ...t,
    userCount: userCountMap[t._id.toString()] ?? 0,
    appointmentCount: apptCountMap[t._id.toString()] ?? 0,
    patientCount: patientCountMap[t._id.toString()] ?? 0,
    doctorCount: doctorCountMap[t._id.toString()] ?? 0,
    staffCount: staffCountMap[t._id.toString()] ?? 0,
  }));

  // Summary stats
  const total = tenants.length;
  const active = tenants.filter((t) => t.isActive).length;
  const byPlan = {
    STARTER: tenants.filter((t) => t.plan === "STARTER").length,
    GROWTH: tenants.filter((t) => t.plan === "GROWTH").length,
    PRO: tenants.filter((t) => t.plan === "PRO").length,
  };

  return apiResponse({
    tenants: data,
    stats: { total, active, inactive: total - active, byPlan },
  });
}

export async function POST(req: NextRequest) {
  const adminId = req.headers.get("x-admin-id");
  if (!adminId) return apiError("Unauthorized", 401);

  await connectDB();

  const { name, slug, plan, ownerName, ownerEmail, ownerPassword } =
    await req.json();

  if (!name || !slug || !ownerName || !ownerEmail || !ownerPassword) {
    return apiError("All fields are required", 400);
  }

  const existing = await Tenant.findOne({ slug: slug.toLowerCase() });
  if (existing) return apiError("Slug already taken", 400);

  const tenant = await Tenant.create({
    name,
    slug: slug.toLowerCase(),
    plan: plan ?? "STARTER",
    planExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    isActive: true,
  });

  await Branch.create({
    tenantId: tenant._id,
    name: "Main Branch",
    code: "MAIN",
    isDefault: true,
  });

  const passwordHash = await bcrypt.hash(ownerPassword, 10);
  const owner = await TenantUser.create({
    tenantId: tenant._id,
    name: ownerName,
    email: ownerEmail.toLowerCase(),
    passwordHash,
    role: "OWNER",
  });

  const roles = await Role.insertMany(
    MASTER_ROLES.map((r) => ({
      tenantId: tenant._id,
      name: r.name,
      description: r.description,
      isSystem: true,
      permissions: r.permissions,
    })),
  );
  const ownerRole = roles.find((r) => r.name === "Owner");

  // Owner is staff too — give them a real Staff/HR record so they show up
  // in the Staff Directory like everyone else, not just as a bare login.
  await Staff.create({
    tenantId: tenant._id,
    staffCode: 9001,
    name: ownerName,
    email: ownerEmail.toLowerCase(),
    role: "Owner",
    ...(ownerRole && { customRoleId: ownerRole._id }),
    userId: owner._id,
  });

  return apiResponse({ tenant }, 201);
}
