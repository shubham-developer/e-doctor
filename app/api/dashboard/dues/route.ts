import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import OpdVisit from "@/models/OpdVisit";
import PharmacyBill from "@/models/PharmacyBill";
import PathologyBill from "@/models/PathologyBill";
import RadiologyBill from "@/models/RadiologyBill";
import IpdAdmission from "@/models/IpdAdmission";
import IpdCharge from "@/models/IpdCharge";
import IpdPayment from "@/models/IpdPayment";
import "@/models/Patient";
import { apiResponse, apiError } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────────

interface PatientRef {
  _id: mongoose.Types.ObjectId;
  name: string;
  uhid?: number;
  phone?: string;
}

interface DueEntry {
  patientId: string;
  name: string;
  uhid?: string;
  phone?: string;
  opd: number;
  ipd: number;
  pharmacy: number;
  pathology: number;
  radiology: number;
  total: number;
  oldestDue: string; // YYYY-MM-DD
}

function isoDate(d: string | Date): string {
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
}

function olderDate(a: string, b: string): string {
  return a < b ? a : b;
}

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return apiError("Unauthorized", 401);

  await connectDB();
  const tid = new mongoose.Types.ObjectId(tenantId);
  const map = new Map<string, DueEntry>();

  function upsert(
    p: PatientRef,
    module: keyof Pick<DueEntry, "opd" | "ipd" | "pharmacy" | "pathology" | "radiology">,
    amount: number,
    date: string,
  ) {
    const pid = String(p._id);
    const existing = map.get(pid);
    if (existing) {
      existing[module] += amount;
      existing.total += amount;
      existing.oldestDue = olderDate(existing.oldestDue, date);
    } else {
      const entry: DueEntry = {
        patientId: pid,
        name: p.name,
        uhid: p.uhid != null ? String(p.uhid) : undefined,
        phone: p.phone,
        opd: 0,
        ipd: 0,
        pharmacy: 0,
        pathology: 0,
        radiology: 0,
        total: 0,
        oldestDue: date,
      };
      entry[module] = amount;
      entry.total = amount;
      map.set(pid, entry);
    }
  }

  // ── OPD ───────────────────────────────────────────────────────────────────────
  const opdDue = await OpdVisit.find({
    tenantId: tid,
    $expr: {
      $gt: [
        { $ifNull: ["$appliedCharge", "$totalFee"] },
        { $ifNull: ["$paidAmount", 0] },
      ],
    },
  })
    .populate<{ patientId: PatientRef }>("patientId", "name uhid phone")
    .select("patientId appliedCharge totalFee paidAmount visitDate")
    .lean();

  for (const v of opdDue) {
    if (!v.patientId) continue;
    const net = (v.appliedCharge ?? v.totalFee ?? 0) - (v.paidAmount ?? 0);
    if (net <= 0) continue;
    upsert(v.patientId, "opd", net, isoDate(v.visitDate));
  }

  // ── Pharmacy ──────────────────────────────────────────────────────────────────
  // PharmacyBill has no stored balance field — compute netAmount - paidAmount
  const pharmaDue = await PharmacyBill.find({
    tenantId: tid,
    $expr: { $gt: ["$netAmount", "$paidAmount"] },
  })
    .populate<{ patientId: PatientRef }>("patientId", "name uhid phone")
    .select("patientId netAmount paidAmount createdAt")
    .lean();

  for (const b of pharmaDue) {
    if (!b.patientId) continue;
    const balance = (b.netAmount ?? 0) - (b.paidAmount ?? 0);
    if (balance <= 0) continue;
    upsert(b.patientId, "pharmacy", balance, isoDate(b.createdAt));
  }

  // ── Pathology ─────────────────────────────────────────────────────────────────
  const pathDue = await PathologyBill.find({ tenantId: tid, balance: { $gt: 0 } })
    .populate<{ patientId: PatientRef }>("patientId", "name uhid phone")
    .select("patientId balance billDate")
    .lean();

  for (const b of pathDue) {
    if (!b.patientId) continue;
    upsert(b.patientId, "pathology", b.balance ?? 0, isoDate(b.billDate));
  }

  // ── Radiology ─────────────────────────────────────────────────────────────────
  const radDue = await RadiologyBill.find({ tenantId: tid, balance: { $gt: 0 } })
    .populate<{ patientId: PatientRef }>("patientId", "name uhid phone")
    .select("patientId balance billDate")
    .lean();

  for (const b of radDue) {
    if (!b.patientId) continue;
    upsert(b.patientId, "radiology", b.balance ?? 0, isoDate(b.billDate));
  }

  // ── IPD ───────────────────────────────────────────────────────────────────────
  // Aggregate total charges and total paid per IPD admission
  const [chargeAgg, paymentAgg] = await Promise.all([
    IpdCharge.aggregate<{ _id: mongoose.Types.ObjectId; total: number }>([
      { $match: { tenantId: tid } },
      { $group: { _id: "$ipdId", total: { $sum: "$total" } } },
    ]),
    IpdPayment.aggregate<{ _id: mongoose.Types.ObjectId; total: number }>([
      { $match: { tenantId: tid } },
      { $group: { _id: "$ipdId", total: { $sum: "$amount" } } },
    ]),
  ]);

  const chargeMap = new Map(chargeAgg.map((r) => [String(r._id), r.total]));
  const payMap = new Map(paymentAgg.map((r) => [String(r._id), r.total]));

  // Find all IPD admission IDs where balance > 0
  const dueIpdIds: mongoose.Types.ObjectId[] = [];
  for (const [id, charges] of chargeMap) {
    const paid = payMap.get(id) ?? 0;
    if (charges - paid > 0) dueIpdIds.push(new mongoose.Types.ObjectId(id));
  }

  if (dueIpdIds.length) {
    const admissions = await IpdAdmission.find({ _id: { $in: dueIpdIds }, tenantId: tid })
      .populate<{ patientId: PatientRef }>("patientId", "name uhid phone")
      .select("patientId admissionDate")
      .lean();

    for (const adm of admissions) {
      if (!adm.patientId) continue;
      const ipdId = String(adm._id);
      const balance = (chargeMap.get(ipdId) ?? 0) - (payMap.get(ipdId) ?? 0);
      if (balance <= 0) continue;
      upsert(adm.patientId, "ipd", balance, isoDate(adm.admissionDate));
    }
  }

  // ── Build response ────────────────────────────────────────────────────────────
  const patients = Array.from(map.values()).sort((a, b) => b.total - a.total);

  const totals = patients.reduce(
    (acc, p) => {
      acc.opd += p.opd;
      acc.ipd += p.ipd;
      acc.pharmacy += p.pharmacy;
      acc.pathology += p.pathology;
      acc.radiology += p.radiology;
      acc.grand += p.total;
      return acc;
    },
    { opd: 0, ipd: 0, pharmacy: 0, pathology: 0, radiology: 0, grand: 0 },
  );

  return apiResponse({ patients, totals });
}
