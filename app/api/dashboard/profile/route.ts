import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import TenantUser from "@/models/TenantUser";
import Staff from "@/models/Staff";
import { apiResponse, apiError } from "@/lib/api";
import { uploadObject } from "@/lib/storage";

const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return apiError("Unauthorized", 401);

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return apiError("Invalid form data", 400);
  }

  const file = formData.get("file") as File | null;
  if (!file) return apiError("No file provided", 400);
  if (!file.type.startsWith("image/")) {
    return apiError("File must be an image", 400);
  }
  if (file.size > MAX_SIZE) return apiError("Image must be under 2 MB", 400);

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const storageKey = `avatars/${session.tenantId}/${session.userId}`;

  await uploadObject(storageKey, buffer, file.type);

  await connectDB();

  const avatarUrl = `/api/dashboard/profile/avatar/${session.userId}`;
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
