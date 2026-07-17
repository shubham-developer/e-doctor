import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import OpdVisit from "@/models/OpdVisit";
import IpdAdmission from "@/models/IpdAdmission";
import IpdCharge from "@/models/IpdCharge";
import IpdPayment from "@/models/IpdPayment";
import "@/models/Staff";
import { apiResponse, apiError } from "@/lib/api";
import type { DoctorRevRow, DoctorRevenueData } from "@/components/reports/types";

interface StaffRef {
  _id: mongoose.Types.ObjectId;
  name: string;
  designation?: string;
}

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  const branchId = req.headers.get("x-branch-id") ?? undefined;
  if (!tenantId) return apiError("Unauthorized", 401);

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  if (!from || !to) return apiError("from and to are required", 400);

  await connectDB();
  const tid = new mongoose.Types.ObjectId(tenantId);
  const bid = branchId ? new mongoose.Types.ObjectId(branchId) : null;
  const map = new Map<string, DoctorRevRow>();

  function getOrCreate(doctor: StaffRef): DoctorRevRow {
    const id = String(doctor._id);
    if (!map.has(id)) {
      map.set(id, {
        doctorId: id,
        name: doctor.name,
        specialization: doctor.designation || undefined,
        opd: { count: 0, net: 0, collected: 0 },
        ipd: { admissions: 0, charges: 0, collected: 0 },
        total: 0,
        collected: 0,
      });
    }
    return map.get(id)!;
  }

  // ── OPD ───────────────────────────────────────────────────────────────────────
  const opdVisits = await OpdVisit.find({
    tenantId: tid,
    ...(bid && { branchId: bid }),
    visitDate: { $gte: from, $lte: to },
    doctorId: { $exists: true, $ne: null },
  })
    .populate<{ doctorId: StaffRef }>("doctorId", "name designation")
    .select("doctorId totalFee appliedCharge paidAmount")
    .lean();

  for (const v of opdVisits) {
    if (!v.doctorId || typeof v.doctorId !== "object") continue;
    const row = getOrCreate(v.doctorId as StaffRef);
    const net = v.appliedCharge ?? v.totalFee ?? 0;
    const paid = v.paidAmount ?? 0;
    row.opd.count += 1;
    row.opd.net += net;
    row.opd.collected += paid;
    row.total += net;
    row.collected += paid;
  }

  // ── IPD ───────────────────────────────────────────────────────────────────────
  const admissions = await IpdAdmission.find({
    tenantId: tid,
    ...(bid && { branchId: bid }),
    admissionDate: { $gte: from, $lte: to },
    doctorId: { $exists: true, $ne: null },
  })
    .populate<{ doctorId: StaffRef }>("doctorId", "name designation")
    .select("doctorId")
    .lean();

  if (admissions.length) {
    const admIds = admissions.map((a) => a._id as mongoose.Types.ObjectId);

    const [chargeAgg, payAgg] = await Promise.all([
      IpdCharge.aggregate<{ _id: mongoose.Types.ObjectId; total: number }>([
        { $match: { tenantId: tid, ipdId: { $in: admIds } } },
        { $group: { _id: "$ipdId", total: { $sum: "$total" } } },
      ]),
      IpdPayment.aggregate<{ _id: mongoose.Types.ObjectId; total: number }>([
        { $match: { tenantId: tid, ipdId: { $in: admIds } } },
        { $group: { _id: "$ipdId", total: { $sum: "$amount" } } },
      ]),
    ]);

    const chargeMap = new Map(chargeAgg.map((r) => [String(r._id), r.total]));
    const payMap = new Map(payAgg.map((r) => [String(r._id), r.total]));

    for (const adm of admissions) {
      if (!adm.doctorId || typeof adm.doctorId !== "object") continue;
      const row = getOrCreate(adm.doctorId as StaffRef);
      const ipdId = String(adm._id);
      const charges = chargeMap.get(ipdId) ?? 0;
      const paid = payMap.get(ipdId) ?? 0;
      row.ipd.admissions += 1;
      row.ipd.charges += charges;
      row.ipd.collected += paid;
      row.total += charges;
      row.collected += paid;
    }
  }

  // ── Build response ────────────────────────────────────────────────────────────
  const doctors = Array.from(map.values()).sort((a, b) => b.total - a.total);

  const totals: DoctorRevenueData["totals"] = {
    opdCount: 0,
    opdNet: 0,
    ipdAdmissions: 0,
    ipdCharges: 0,
    grand: 0,
    grandCollected: 0,
  };
  for (const d of doctors) {
    totals.opdCount += d.opd.count;
    totals.opdNet += d.opd.net;
    totals.ipdAdmissions += d.ipd.admissions;
    totals.ipdCharges += d.ipd.charges;
    totals.grand += d.total;
    totals.grandCollected += d.collected;
  }

  return apiResponse({ doctors, totals } satisfies DoctorRevenueData);
}
