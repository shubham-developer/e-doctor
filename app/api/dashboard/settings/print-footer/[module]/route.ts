import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Tenant from "@/models/Tenant";
import { apiResponse, apiError } from "@/lib/api";
import { uploadObject, deleteObject, getSignedFileUrl } from "@/lib/storage";
import { PRINT_MODULES, type PrintModuleKey } from "@/lib/print/layouts";

const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

function isPrintModule(module: string): module is PrintModuleKey {
  return PRINT_MODULES.some(({ key }) => key === module);
}

/**
 * Upload/replace the custom print footer image for a module. The image is
 * stored as the module's footer content (`<img>` HTML in
 * `printFooterContents`), so printers render it through the same footer
 * pipeline without extra plumbing.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ module: string }> },
) {
  const tenantId = req.headers.get("x-tenant-id");
  const role = req.headers.get("x-user-role");
  if (!tenantId) return apiError("Unauthorized", 401);
  if (role === "VIEWER") return apiError("Insufficient permissions", 403);

  const { module } = await params;
  if (!isPrintModule(module)) return apiError("Invalid print module", 400);

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

  const buffer = Buffer.from(await file.arrayBuffer());
  await uploadObject(`print-footers/${tenantId}/${module}`, buffer, file.type);

  await connectDB();

  const url = `/api/dashboard/settings/print-footer/${module}`;
  const html = `<img src="${url}" alt="footer" style="width:100%;display:block" />`;
  const tenant = await Tenant.findByIdAndUpdate(
    tenantId,
    { $set: { [`printFooterContents.${module}`]: html } },
    { new: true },
  );
  if (!tenant) return apiError("Tenant not found", 404);

  return apiResponse({ url, html });
}

/** Serve the stored footer image (redirects to a signed storage URL). */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ module: string }> },
) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return apiError("Unauthorized", 401);

  const { module } = await params;
  if (!isPrintModule(module)) return apiError("Invalid print module", 400);

  await connectDB();
  const tenant = await Tenant.findById(tenantId).select("printFooterContents");
  if (!tenant?.printFooterContents?.[module]) {
    return apiError("Not found", 404);
  }

  const url = await getSignedFileUrl(`print-footers/${tenantId}/${module}`, {
    expiresIn: 3600,
  });
  return NextResponse.redirect(url);
}

/** Remove the footer image so the module prints without a footer. */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ module: string }> },
) {
  const tenantId = req.headers.get("x-tenant-id");
  const role = req.headers.get("x-user-role");
  if (!tenantId) return apiError("Unauthorized", 401);
  if (role === "VIEWER") return apiError("Insufficient permissions", 403);

  const { module } = await params;
  if (!isPrintModule(module)) return apiError("Invalid print module", 400);

  await deleteObject(`print-footers/${tenantId}/${module}`).catch(() => {
    // Object may already be gone; still clear the tenant field.
  });

  await connectDB();
  const tenant = await Tenant.findByIdAndUpdate(
    tenantId,
    { $unset: { [`printFooterContents.${module}`]: "" } },
    { new: true },
  );
  if (!tenant) return apiError("Tenant not found", 404);

  return apiResponse({ removed: true });
}
