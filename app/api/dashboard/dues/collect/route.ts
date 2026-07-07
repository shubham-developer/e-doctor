import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import OpdVisit from "@/models/OpdVisit";
import PharmacyBill from "@/models/PharmacyBill";
import PathologyBill from "@/models/PathologyBill";
import RadiologyBill from "@/models/RadiologyBill";
import IpdAdmission from "@/models/IpdAdmission";
import IpdPayment from "@/models/IpdPayment";
import IpdCharge from "@/models/IpdCharge";
import { apiResponse, apiError } from "@/lib/api";

// Distribute `budget` across unpaid bills (sorted oldest first).
// Returns remaining budget after clearing.
async function clearOpdDues(
  tenantId: mongoose.Types.ObjectId,
  patientId: mongoose.Types.ObjectId,
  budget: number,
  paymentMode: string,
): Promise<number> {
  const visits = await OpdVisit.find({
    tenantId,
    patientId,
    $expr: { $gt: [{ $ifNull: ["$appliedCharge", "$totalFee"] }, { $ifNull: ["$paidAmount", 0] }] },
  }).sort({ visitDate: 1 }).lean();

  for (const v of visits) {
    if (budget <= 0) break;
    const charged = v.appliedCharge ?? v.totalFee ?? 0;
    const paid = v.paidAmount ?? 0;
    const balance = charged - paid;
    if (balance <= 0) continue;
    const apply = Math.min(budget, balance);
    await OpdVisit.updateOne(
      { _id: v._id },
      { $inc: { paidAmount: apply }, $set: { paymentMode } },
    );
    budget -= apply;
  }
  return budget;
}

async function clearPharmacyDues(
  tenantId: mongoose.Types.ObjectId,
  patientId: mongoose.Types.ObjectId,
  budget: number,
  paymentMode: string,
): Promise<number> {
  const bills = await PharmacyBill.find({
    tenantId, patientId, $expr: { $gt: ["$netAmount", "$paidAmount"] },
  }).sort({ createdAt: 1 }).lean();

  for (const b of bills) {
    if (budget <= 0) break;
    const balance = (b.netAmount ?? 0) - (b.paidAmount ?? 0);
    if (balance <= 0) continue;
    const apply = Math.min(budget, balance);
    await PharmacyBill.updateOne(
      { _id: b._id },
      { $inc: { paidAmount: apply }, $set: { paymentMode, balance: Math.max(0, balance - apply) } },
    );
    budget -= apply;
  }
  return budget;
}

async function clearPathologyDues(
  tenantId: mongoose.Types.ObjectId,
  patientId: mongoose.Types.ObjectId,
  budget: number,
  paymentMode: string,
): Promise<number> {
  const bills = await PathologyBill.find({
    tenantId, patientId, balance: { $gt: 0 },
  }).sort({ billDate: 1 }).lean();

  for (const b of bills) {
    if (budget <= 0) break;
    const balance = b.balance ?? 0;
    if (balance <= 0) continue;
    const apply = Math.min(budget, balance);
    await PathologyBill.updateOne(
      { _id: b._id },
      { $inc: { paidAmount: apply }, $set: { paymentMode, balance: Math.max(0, balance - apply) } },
    );
    budget -= apply;
  }
  return budget;
}

async function clearRadiologyDues(
  tenantId: mongoose.Types.ObjectId,
  patientId: mongoose.Types.ObjectId,
  budget: number,
  paymentMode: string,
): Promise<number> {
  const bills = await RadiologyBill.find({
    tenantId, patientId, balance: { $gt: 0 },
  }).sort({ billDate: 1 }).lean();

  for (const b of bills) {
    if (budget <= 0) break;
    const balance = b.balance ?? 0;
    if (balance <= 0) continue;
    const apply = Math.min(budget, balance);
    await RadiologyBill.updateOne(
      { _id: b._id },
      { $inc: { paidAmount: apply }, $set: { paymentMode, balance: Math.max(0, balance - apply) } },
    );
    budget -= apply;
  }
  return budget;
}

async function clearIpdDues(
  tenantId: mongoose.Types.ObjectId,
  patientId: mongoose.Types.ObjectId,
  budget: number,
  paymentMode: string,
  addedByName: string,
): Promise<number> {
  // Find IPD admissions for this patient
  const admissions = await IpdAdmission.find({ tenantId, patientId })
    .select("_id admissionDate").sort({ admissionDate: 1 }).lean();

  const ipdIds = admissions.map((a) => a._id);
  if (!ipdIds.length) return budget;

  const [chargeAgg, paymentAgg] = await Promise.all([
    IpdCharge.aggregate<{ _id: mongoose.Types.ObjectId; total: number }>([
      { $match: { tenantId, ipdId: { $in: ipdIds } } },
      { $group: { _id: "$ipdId", total: { $sum: "$total" } } },
    ]),
    IpdPayment.aggregate<{ _id: mongoose.Types.ObjectId; total: number }>([
      { $match: { tenantId, ipdId: { $in: ipdIds } } },
      { $group: { _id: "$ipdId", total: { $sum: "$amount" } } },
    ]),
  ]);

  const chargeMap = new Map(chargeAgg.map((r) => [String(r._id), r.total]));
  const payMap = new Map(paymentAgg.map((r) => [String(r._id), r.total]));

  for (const adm of admissions) {
    if (budget <= 0) break;
    const ipdId = String(adm._id);
    const charged = chargeMap.get(ipdId) ?? 0;
    const paid = payMap.get(ipdId) ?? 0;
    const balance = charged - paid;
    if (balance <= 0) continue;
    const apply = Math.min(budget, balance);
    await IpdPayment.create({
      tenantId,
      ipdId: adm._id,
      amount: apply,
      paymentMode,
      date: new Date().toISOString().slice(0, 10),
      addedByName,
      note: "Collected via Dues clearance",
    });
    budget -= apply;
  }
  return budget;
}

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  const userName = req.headers.get("x-user-name") ?? "Admin";
  if (!tenantId) return apiError("Unauthorized", 401);

  await connectDB();
  const body = await req.json();
  const { patientId, amount, paymentMode = "CASH" } = body;

  if (!patientId) return apiError("patientId is required", 400);
  if (!amount || Number(amount) <= 0) return apiError("amount must be > 0", 400);

  const tid = new mongoose.Types.ObjectId(tenantId);
  const pid = new mongoose.Types.ObjectId(patientId);
  let budget = Number(amount);

  // Distribute payment: OPD → Pharmacy → Pathology → Radiology → IPD
  budget = await clearOpdDues(tid, pid, budget, paymentMode);
  budget = await clearPharmacyDues(tid, pid, budget, paymentMode);
  budget = await clearPathologyDues(tid, pid, budget, paymentMode);
  budget = await clearRadiologyDues(tid, pid, budget, paymentMode);
  budget = await clearIpdDues(tid, pid, budget, paymentMode, userName);

  const collected = Number(amount) - budget;
  return apiResponse({ collected, remaining: budget });
}
