import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import ActivityLog from "@/models/ActivityLog";
import TenantUser from "@/models/TenantUser";
import { apiResponse, apiError } from "@/lib/api";

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  const role = req.headers.get("x-user-role");
  if (!tenantId) return apiError("Unauthorized", 401);
  if (role !== "OWNER")
    return apiError("Only owners can view user logs", 403);

  await connectDB();

  const sp = req.nextUrl.searchParams;
  const search = sp.get("search") ?? "";
  const userId = sp.get("userId") ?? "";
  const module_ = sp.get("module") ?? "";
  const action = sp.get("action") ?? "";
  const page = Math.max(1, parseInt(sp.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, parseInt(sp.get("limit") ?? "50")));

  const query: Record<string, unknown> = { tenantId };
  if (userId) query.userId = userId;
  if (module_) query.module = module_;
  if (action) query.action = action;
  if (search) {
    query.$or = [
      { description: { $regex: search, $options: "i" } },
      { userName: { $regex: search, $options: "i" } },
    ];
  }

  const [logs, total, users] = await Promise.all([
    ActivityLog.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    ActivityLog.countDocuments(query),
    TenantUser.find({ tenantId }, "name role").sort({ name: 1 }),
  ]);

  return apiResponse({
    logs,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    users: users.map((u) => ({
      _id: String(u._id),
      name: u.name,
      role: u.role,
    })),
  });
}
