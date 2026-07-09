import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import TenantUser from "@/models/TenantUser";
import Staff from "@/models/Staff";
import { apiResponse, apiError } from "@/lib/api";

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return apiError("Unauthorized", 401);

  const { avatarUrl } = await req.json();
  if (typeof avatarUrl !== "string") {
    return apiError("avatarUrl is required", 400);
  }

  await connectDB();

  const user = await TenantUser.findOneAndUpdate(
    { _id: session.userId, tenantId: session.tenantId },
    { $set: { avatarUrl } },
    { new: true },
  );
  if (!user) return apiError("User not found", 404);

  // Keep the linked Staff card photo in sync, if one exists.
  await Staff.findOneAndUpdate(
    { userId: user._id, tenantId: session.tenantId },
    { $set: { photoUrl: avatarUrl } },
  );

  return apiResponse({ avatarUrl: user.avatarUrl });
}
