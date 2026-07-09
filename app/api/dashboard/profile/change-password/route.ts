import bcrypt from "bcryptjs";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import TenantUser from "@/models/TenantUser";
import { apiResponse, apiError } from "@/lib/api";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return apiError("Unauthorized", 401);

  const { currentPassword, newPassword } = await req.json();
  if (!currentPassword || !newPassword) {
    return apiError("Current and new password are required", 400);
  }
  if (newPassword.length < 6) {
    return apiError("New password must be at least 6 characters", 400);
  }

  await connectDB();

  const user = await TenantUser.findOne({
    _id: session.userId,
    tenantId: session.tenantId,
  });
  if (!user) return apiError("User not found", 404);

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) return apiError("Current password is incorrect", 400);

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  await user.save();

  return apiResponse({ changed: true });
}
