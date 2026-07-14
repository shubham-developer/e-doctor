import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Tenant from "@/models/Tenant";
import TenantUser from "@/models/TenantUser";
import "@/models/Role"; // register model so populate() works
import { apiResponse, apiError } from "@/lib/api";

export async function GET() {
  const session = await getSession();
  if (!session) return apiError("Unauthorized", 401);

  await connectDB();

  const [tenant, tenantUser] = await Promise.all([
    Tenant.findById(session.tenantId),
    TenantUser.findById(session.userId)
      .populate("customRoleId", "name permissions")
      .catch(() => null),
  ]);

  if (!tenant) return apiError("Tenant not found", 404);

  // customRoleId is null/undefined when user has no custom role assigned
  const populated = tenantUser?.customRoleId;
  const isPopulated =
    populated && typeof populated === "object" && "name" in populated;
  const customRole = isPopulated
    ? (populated as { name: string; permissions: Record<string, unknown> })
    : null;

  return apiResponse({
    user: {
      id: session.userId,
      name: session.name,
      email: session.email,
      role: session.role,
      avatarUrl: tenantUser?.avatarUrl ?? null,
      customRole: customRole
        ? { name: customRole.name, permissions: customRole.permissions ?? {} }
        : null,
    },
    tenant: {
      id: tenant._id,
      name: tenant.name,
      slug: tenant.slug,
      address: tenant.address,
      phone: tenant.phone,
      logoUrl: tenant.logoUrl,
      smallLogoUrl: tenant.smallLogoUrl,
      brandColor: tenant.brandColor,
      plan: tenant.plan,
      planExpiresAt: tenant.planExpiresAt,
      currency: tenant.currency ?? "INR",
      currencySymbol: tenant.currencySymbol ?? "₹",
      dateFormat: tenant.dateFormat ?? "MM/DD/YYYY",
      printLayouts: tenant.printLayouts ?? {},
      printShowLogo: tenant.printShowLogo ?? {},
      printHeaderImages: tenant.printHeaderImages ?? {},
      printFooterContents: tenant.printFooterContents ?? {},
      enabledModules: tenant.enabledModules ?? null,
      opdRevisitDays: tenant.opdRevisitDays ?? 0,
      opdFreeRevisits: tenant.opdFreeRevisits ?? 0,
    },
  });
}
