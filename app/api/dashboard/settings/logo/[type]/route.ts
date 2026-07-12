import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Tenant from "@/models/Tenant";
import { getSignedFileUrl } from "@/lib/storage";

const LOGO_FIELDS = {
  logo: "logoUrl",
  smallLogo: "smallLogoUrl",
} as const;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const { type } = await params;
  if (!(type in LOGO_FIELDS)) {
    return NextResponse.json({ success: false, error: "Invalid logo type" }, { status: 400 });
  }

  await connectDB();
  const field = LOGO_FIELDS[type as keyof typeof LOGO_FIELDS];
  const tenant = await Tenant.findById(tenantId).select(field);
  if (!tenant?.[field]) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  const url = await getSignedFileUrl(`logos/${tenantId}/${type}`, {
    expiresIn: 3600,
  });

  return NextResponse.redirect(url);
}
