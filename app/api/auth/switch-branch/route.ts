import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Branch from "@/models/Branch";
import TenantUser from "@/models/TenantUser";
import { getSession, signToken, COOKIE_NAME } from "@/lib/auth";
import { apiResponse, apiError } from "@/lib/api";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return apiError("Unauthorized", 401);

  const { branchId } = await req.json();
  if (!branchId) return apiError("branchId is required", 400);

  await connectDB();

  const branch = await Branch.findOne({
    _id: branchId,
    tenantId: session.tenantId,
    isActive: true,
  });
  if (!branch) return apiError("Branch not found", 404);

  const tenantUser = await TenantUser.findById(session.userId);
  if (!tenantUser) return apiError("User not found", 404);

  const allowed =
    tenantUser.branchIds.length === 0 ||
    tenantUser.branchIds.some(
      (id: mongoose.Types.ObjectId) => id.toString() === branchId,
    );
  if (!allowed) return apiError("You don't have access to this branch", 403);

  const token = await signToken({
    userId: session.userId,
    tenantId: session.tenantId,
    branchId: branch._id.toString(),
    role: session.role,
    email: session.email,
    name: session.name,
  });

  const response = apiResponse({
    branch: { id: branch._id, name: branch.name, code: branch.code },
  });

  const res = new Response(response.body, {
    status: 200,
    headers: response.headers,
  });
  res.headers.set(
    "Set-Cookie",
    `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${24 * 60 * 60}`,
  );
  return res;
}
