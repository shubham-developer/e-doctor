import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import IpdFile from "@/models/IpdFile";
import { apiResponse, apiError } from "@/lib/api";

const MAX_SIZE = 15 * 1024 * 1024; // 15 MB (MongoDB doc limit is 16 MB)

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return apiError("Unauthorized", 401);

  const { id } = await params;
  await connectDB();

  const files = await IpdFile.find({ tenantId, ipdId: id })
    .select("-data")
    .sort({ createdAt: -1 })
    .lean();

  return apiResponse(files);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const tenantId = req.headers.get("x-tenant-id");
  const userName = req.headers.get("x-user-name");
  const role = req.headers.get("x-user-role");
  if (!tenantId) return apiError("Unauthorized", 401);
  if (role === "VIEWER") return apiError("Insufficient permissions", 403);

  const { id } = await params;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return apiError("Invalid form data", 400);
  }

  const file = formData.get("file") as File | null;
  if (!file) return apiError("No file provided", 400);
  if (file.size > MAX_SIZE) return apiError("File too large (max 15 MB)", 400);

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  await connectDB();

  const saved = await IpdFile.create({
    tenantId,
    ipdId: id,
    filename: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    data: buffer,
    uploadedByName: userName ?? undefined,
  });

  return apiResponse(
    {
      _id: saved._id,
      filename: saved.filename,
      mimeType: saved.mimeType,
      size: saved.size,
      uploadedByName: saved.uploadedByName,
      createdAt: saved.createdAt,
    },
    201,
  );
}
