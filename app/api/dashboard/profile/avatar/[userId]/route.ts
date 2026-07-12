import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import TenantUser from "@/models/TenantUser";
import { getSignedFileUrl } from "@/lib/storage";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { userId } = await params;
  await connectDB();

  const user = await TenantUser.findOne({ _id: userId, tenantId }).select("avatarUrl");
  if (!user?.avatarUrl) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  const url = await getSignedFileUrl(`avatars/${tenantId}/${userId}`, {
    expiresIn: 3600,
  });

  return NextResponse.redirect(url);
}
