import { NextRequest } from "next/server";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import TenantUser from "@/models/TenantUser";
import Tenant from "@/models/Tenant";
import Branch from "@/models/Branch";
import { signToken } from "@/lib/auth";
import { apiResponse, apiError } from "@/lib/api";
import { logActivityRaw } from "@/lib/activityLog";

/**
 * Picks the branch a user's session should start in. `allowedBranchIds`
 * empty means unrestricted (e.g. OWNER accounts) — otherwise the result is
 * always one of those ids, never the tenant-wide default/fallback.
 */
async function resolveActiveBranch(
  tenantId: string,
  defaultBranchId: string | undefined,
  allowedBranchIds: string[],
) {
  const restricted = allowedBranchIds.length > 0;

  if (defaultBranchId && (!restricted || allowedBranchIds.includes(defaultBranchId))) {
    const branch = await Branch.findOne({
      _id: defaultBranchId,
      tenantId,
      isActive: true,
    });
    if (branch) return branch;
  }

  if (restricted) {
    return Branch.findOne({
      tenantId,
      _id: { $in: allowedBranchIds },
      isActive: true,
    }).sort({ isDefault: -1, createdAt: 1 });
  }

  const tenantDefault = await Branch.findOne({ tenantId, isDefault: true });
  if (tenantDefault) return tenantDefault;
  return Branch.findOne({ tenantId, isActive: true }).sort({ createdAt: 1 });
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return apiError("Email and password are required", 400);
    }

    await connectDB();

    const user = await TenantUser.findOne({ email: email.toLowerCase() });
    if (!user) {
      return apiError("Invalid credentials", 401);
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return apiError("Invalid credentials", 401);
    }

    const tenant = await Tenant.findById(user.tenantId);
    if (!tenant || !tenant.isActive) {
      return apiError("Clinic account is inactive", 403);
    }

    const branch = await resolveActiveBranch(
      user.tenantId.toString(),
      user.defaultBranchId?.toString(),
      user.branchIds.map((id: mongoose.Types.ObjectId) => id.toString()),
    );

    logActivityRaw({
      tenantId: user.tenantId.toString(),
      branchId: branch?._id.toString(),
      userId: user._id.toString(),
      userName: user.name,
      userRole: user.role,
      action: "login",
      module: "auth",
      description: "Signed in",
    });

    const token = await signToken({
      userId: user._id.toString(),
      tenantId: user.tenantId.toString(),
      branchId: branch?._id.toString() ?? "",
      role: user.role,
      email: user.email,
      name: user.name,
    });

    const response = apiResponse({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      tenant: {
        id: tenant._id,
        name: tenant.name,
        plan: tenant.plan,
        logoUrl: tenant.logoUrl,
      },
    });

    const res = new Response(response.body, {
      status: 200,
      headers: response.headers,
    });

    res.headers.set(
      "Set-Cookie",
      `doctorcloud_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${24 * 60 * 60}`,
    );

    return res;
  } catch (err) {
    console.error(err);
    return apiError("Internal server error", 500);
  }
}
