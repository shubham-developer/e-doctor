import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import PharmacyPurchase from "@/models/PharmacyPurchase";
import Medicine from "@/models/Medicine";
import Supplier from "@/models/Supplier";
import { apiResponse, apiError } from "@/lib/api";

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return apiError("Unauthorized", 401);

  await connectDB();

  const search = req.nextUrl.searchParams.get("search") ?? "";
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? "1"));
  const limit = Math.min(
    200,
    Math.max(1, Number(req.nextUrl.searchParams.get("limit") ?? "100")),
  );

  const query: Record<string, unknown> = { tenantId };
  if (search) {
    query.$or = [
      { supplierName: { $regex: search, $options: "i" } },
      { billNo: { $regex: search, $options: "i" } },
      { purchaseNo: isNaN(Number(search)) ? undefined : Number(search) },
    ].filter((c) => Object.values(c)[0] !== undefined);
  }

  const [purchases, total] = await Promise.all([
    PharmacyPurchase.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    PharmacyPurchase.countDocuments(query),
  ]);

  return apiResponse({
    purchases,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  const role = req.headers.get("x-user-role");
  const userId = req.headers.get("x-user-id") ?? "";
  const userName = req.headers.get("x-user-name") ?? "";
  if (!tenantId) return apiError("Unauthorized", 401);
  if (role === "VIEWER") return apiError("Insufficient permissions", 403);

  await connectDB();
  const body = await req.json();
  const {
    supplierId,
    billNo,
    note,
    lines,
    totalAmount,
    discountPercent,
    discountAmount,
    taxAmount,
    netAmount,
    paymentMode,
    paymentAmount,
    paymentNote,
  } = body;

  if (!supplierId) return apiError("Supplier is required", 400);
  if (!lines?.length)
    return apiError("At least one medicine line is required", 400);

  const [supplier, purchaseCount] = await Promise.all([
    Supplier.findOne({ _id: supplierId, tenantId }),
    PharmacyPurchase.countDocuments({ tenantId }),
  ]);
  if (!supplier) return apiError("Supplier not found", 404);

  // restock medicines: update available qty and latest batch info
  await Promise.all(
    lines.map((ln: Record<string, unknown>) => {
      if (!ln.medicineId) return Promise.resolve();
      return Medicine.findOneAndUpdate(
        { _id: ln.medicineId, tenantId },
        {
          $inc: { availableQty: Number(ln.quantity) || 0 },
          $set: {
            batchNo: ln.batchNo,
            expiryDate: ln.expiryMonth,
            salePrice: Number(ln.salePrice) || 0,
            taxPercent: Number(ln.taxPercent) || 0,
          },
        },
      );
    }),
  );

  const purchaseNo = purchaseCount + 1;
  const purchase = await PharmacyPurchase.create({
    tenantId,
    purchaseNo,
    ...(billNo?.trim() && { billNo: billNo.trim() }),
    purchaseDate: new Date(),
    supplierId: supplier._id,
    supplierName: supplier.name,
    lines: lines.map((ln: Record<string, unknown>) => ({
      medicineId: ln.medicineId,
      medicineName: String(ln.medicineName ?? ""),
      category: ln.category,
      batchNo: String(ln.batchNo ?? ""),
      expiryMonth: String(ln.expiryMonth ?? ""),
      mrp: Number(ln.mrp) || 0,
      batchAmount: Number(ln.batchAmount) || 0,
      salePrice: Number(ln.salePrice) || 0,
      packingQty: Number(ln.packingQty) || 0,
      quantity: Number(ln.quantity) || 0,
      purchasePrice: Number(ln.purchasePrice) || 0,
      taxPercent: Number(ln.taxPercent) || 0,
      amount: Number(ln.amount) || 0,
    })),
    ...(note?.trim() && { note: note.trim() }),
    totalAmount: Number(totalAmount) || 0,
    discountPercent: Number(discountPercent) || 0,
    discountAmount: Number(discountAmount) || 0,
    taxAmount: Number(taxAmount) || 0,
    netAmount: Number(netAmount) || 0,
    paymentMode: paymentMode ?? "",
    paymentAmount: Number(paymentAmount) || 0,
    ...(paymentNote?.trim() && { paymentNote: paymentNote.trim() }),
    createdBy: { userId, name: userName },
  });

  return apiResponse({ purchase, purchaseNo }, 201);
}
