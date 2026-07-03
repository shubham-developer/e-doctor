import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import PharmacyBill from "@/models/PharmacyBill";
import Medicine from "@/models/Medicine";
import Patient from "@/models/Patient";
import Doctor from "@/models/Doctor";
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
    const matchingPatients = await Patient.find(
      { tenantId, name: { $regex: search, $options: "i" } },
      "_id",
    );
    query.$or = [
      { patientId: { $in: matchingPatients.map((p) => p._id) } },
      { billNumber: isNaN(Number(search)) ? undefined : Number(search) },
      { prescriptionNo: { $regex: search, $options: "i" } },
    ].filter((c) => Object.values(c)[0] !== undefined);
  }

  const [bills, total] = await Promise.all([
    PharmacyBill.find(query)
      .populate("patientId", "name patientCode")
      .populate("doctorId", "name")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    PharmacyBill.countDocuments(query),
  ]);

  return apiResponse({
    bills,
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
    patientId,
    doctorId,
    doctorName,
    caseId,
    prescriptionNo,
    applyTpa,
    lines,
    totalAmount,
    discountAmount,
    taxAmount,
    netAmount,
    paymentMode,
    paidAmount,
    note,
  } = body;

  if (!lines?.length)
    return apiError("At least one medicine line is required", 400);

  const [patient, doctor, billCount] = await Promise.all([
    patientId
      ? Patient.findOne({ _id: patientId, tenantId })
      : Promise.resolve(null),
    doctorId
      ? Doctor.findOne({ _id: doctorId, tenantId })
      : Promise.resolve(null),
    PharmacyBill.countDocuments({ tenantId }),
  ]);

  if (patientId && !patient) return apiError("Patient not found", 404);

  // deduct stock quantities, only where sufficient stock is available
  const stockUpdates = await Promise.all(
    lines.map(
      (ln: {
        medicineId?: string;
        medicineName?: string;
        quantity: number;
      }) => {
        if (!ln.medicineId) return Promise.resolve(null);
        const qty = Number(ln.quantity) || 0;
        return Medicine.findOneAndUpdate(
          { _id: ln.medicineId, tenantId, availableQty: { $gte: qty } },
          { $inc: { availableQty: -qty } },
        );
      },
    ),
  );
  const insufficientIdx = stockUpdates.findIndex(
    (res, i) => lines[i].medicineId && !res,
  );
  if (insufficientIdx !== -1) {
    // revert any deductions already applied before the failing line
    await Promise.all(
      stockUpdates.map((res, i) => {
        if (!res) return Promise.resolve();
        const qty = Number(lines[i].quantity) || 0;
        return Medicine.findOneAndUpdate(
          { _id: lines[i].medicineId, tenantId },
          { $inc: { availableQty: qty } },
        );
      }),
    );
    return apiError(
      `Insufficient stock for ${lines[insufficientIdx].medicineName}`,
      400,
    );
  }

  const billNumber = billCount + 1;
  try {
    const bill = await PharmacyBill.create({
      tenantId,
      billNumber,
      ...(patient && { patientId: patient._id }),
      ...(doctor && { doctorId: doctor._id }),
      ...(doctorName?.trim() && { doctorName: doctorName.trim() }),
      ...(caseId?.trim() && { caseId: caseId.trim() }),
      ...(prescriptionNo?.trim() && { prescriptionNo: prescriptionNo.trim() }),
      applyTpa: Boolean(applyTpa),
      lines: lines.map((ln: Record<string, unknown>) => ({
        medicineId: ln.medicineId,
        medicineName: String(ln.medicineName ?? ""),
        category: ln.category,
        batchNo: ln.batchNo,
        expiryDate: ln.expiryDate,
        quantity: Number(ln.quantity) || 0,
        salePrice: Number(ln.salePrice) || 0,
        taxPercent: Number(ln.taxPercent) || 0,
        discountPercent: Number(ln.discountPercent) || 0,
        amount: Number(ln.amount) || 0,
      })),
      totalAmount: Number(totalAmount) || 0,
      discountAmount: Number(discountAmount) || 0,
      taxAmount: Number(taxAmount) || 0,
      netAmount: Number(netAmount) || 0,
      paymentMode: paymentMode || "Cash",
      paidAmount: Number(paidAmount) || 0,
      payments:
        Number(paidAmount) > 0
          ? [
              {
                amount: Number(paidAmount),
                mode: paymentMode || "Cash",
                createdAt: new Date(),
                createdBy: { userId, name: userName },
              },
            ]
          : [],
      ...(note?.trim() && { note: note.trim() }),
      createdBy: { userId, name: userName },
    });

    return apiResponse({ bill, billNumber }, 201);
  } catch (err) {
    // bill creation failed after stock was already deducted — revert it
    await Promise.all(
      lines.map((ln: { medicineId?: string; quantity: number }) => {
        if (!ln.medicineId) return Promise.resolve();
        const qty = Number(ln.quantity) || 0;
        return Medicine.findOneAndUpdate(
          { _id: ln.medicineId, tenantId },
          { $inc: { availableQty: qty } },
        );
      }),
    );
    throw err;
  }
}
