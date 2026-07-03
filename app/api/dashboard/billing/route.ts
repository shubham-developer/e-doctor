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
import Patient from "@/models/Patient";
import "@/models/Staff";
import { apiResponse, apiError } from "@/lib/api";
import { todayString } from "@/lib/format";

function strRange(from: string, to: string) {
  // T23:59:59 suffix ensures datetime-stored fields (e.g. admissionDate "2026-07-03T18:08")
  // are matched. Plain date strings ("2026-07-03") remain <= "2026-07-03T23:59:59".
  return { $gte: from, $lte: to + "T23:59:59" };
}

// PharmacyBill uses createdAt (Date), not a billDate string
function dateObjRange(from: string, to: string) {
  return {
    $gte: new Date(from + "T00:00:00.000Z"),
    $lte: new Date(to + "T23:59:59.999Z"),
  };
}

async function patientFilter(
  tenantId: mongoose.Types.ObjectId,
  search: string,
) {
  if (!search) return null;
  const pts = await Patient.find(
    { tenantId, name: { $regex: search, $options: "i" } },
    "_id",
  ).limit(200);
  return pts.map((p) => p._id);
}

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return apiError("Unauthorized", 401);

  await connectDB();

  const sp = req.nextUrl.searchParams;
  const module = sp.get("module") ?? "summary";
  const from = sp.get("from") ?? todayString();
  const to = sp.get("to") ?? todayString();
  const search = sp.get("search") ?? "";
  const status = sp.get("status") ?? "all";
  const page = Math.max(1, Number(sp.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, Number(sp.get("limit") ?? "50")));
  const tid = new mongoose.Types.ObjectId(tenantId);

  // ── Summary ────────────────────────────────────────────────────────────────
  if (module === "summary") {
    const pharmDateRange = dateObjRange(from, to);
    const [opd, phar, path, rad, ipdAdm, ipdPay] = await Promise.all([
      OpdVisit.aggregate([
        { $match: { tenantId: tid, visitDate: strRange(from, to) } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            collected: { $sum: "$paidAmount" },
          },
        },
      ]),
      PharmacyBill.aggregate([
        { $match: { tenantId: tid, createdAt: pharmDateRange } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            net: { $sum: "$netAmount" },
            paid: { $sum: "$paidAmount" },
          },
        },
      ]),
      PathologyBill.aggregate([
        { $match: { tenantId: tid, billDate: strRange(from, to) } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            net: { $sum: "$netAmount" },
            paid: { $sum: "$paidAmount" },
            balance: { $sum: "$balance" },
          },
        },
      ]),
      RadiologyBill.aggregate([
        { $match: { tenantId: tid, billDate: strRange(from, to) } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            net: { $sum: "$netAmount" },
            paid: { $sum: "$paidAmount" },
            balance: { $sum: "$balance" },
          },
        },
      ]),
      IpdAdmission.countDocuments({
        tenantId: tid,
        admissionDate: strRange(from, to),
      }),
      IpdPayment.aggregate([
        { $match: { tenantId: tid, date: strRange(from, to) } },
        { $group: { _id: null, collected: { $sum: "$amount" } } },
      ]),
    ]);

    const pharNet = phar[0]?.net ?? 0;
    const pharPaid = phar[0]?.paid ?? 0;

    return apiResponse({
      opd: { count: opd[0]?.count ?? 0, collected: opd[0]?.collected ?? 0 },
      pharmacy: {
        count: phar[0]?.count ?? 0,
        net: pharNet,
        paid: pharPaid,
        balance: Math.max(0, pharNet - pharPaid),
      },
      pathology: {
        count: path[0]?.count ?? 0,
        net: path[0]?.net ?? 0,
        paid: path[0]?.paid ?? 0,
        balance: path[0]?.balance ?? 0,
      },
      radiology: {
        count: rad[0]?.count ?? 0,
        net: rad[0]?.net ?? 0,
        paid: rad[0]?.paid ?? 0,
        balance: rad[0]?.balance ?? 0,
      },
      ipd: { admissions: ipdAdm, collected: ipdPay[0]?.collected ?? 0 },
    });
  }

  // ── OPD ─────────────────────────────────────────────────────────────────────
  if (module === "opd") {
    const ptIds = await patientFilter(tid, search);
    if (ptIds && ptIds.length === 0)
      return apiResponse({ bills: [], total: 0, totalPages: 0, page });

    const q: Record<string, unknown> = {
      tenantId: tid,
      visitDate: strRange(from, to),
    };
    if (ptIds) q.patientId = { $in: ptIds };

    const [total, bills] = await Promise.all([
      OpdVisit.countDocuments(q),
      OpdVisit.find(q)
        .populate(
          "patientId",
          "name patientCode age ageMonths ageDays gender bloodGroup address allergies previousMedicalIssue phone",
        )
        .populate("doctorId", "name specialization designation")
        .sort({ visitDate: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
    ]);
    return apiResponse({
      bills,
      total,
      totalPages: Math.ceil(total / limit),
      page,
    });
  }

  // ── Pharmacy ─────────────────────────────────────────────────────────────────
  if (module === "pharmacy") {
    const ptIds = await patientFilter(tid, search);
    if (ptIds && ptIds.length === 0)
      return apiResponse({ bills: [], total: 0, totalPages: 0, page });

    const q: Record<string, unknown> = {
      tenantId: tid,
      createdAt: dateObjRange(from, to),
    };
    if (ptIds) q.patientId = { $in: ptIds };
    if (status === "paid") q.$expr = { $lte: ["$netAmount", "$paidAmount"] };
    if (status === "partial")
      q.$expr = {
        $and: [
          { $gt: ["$paidAmount", 0] },
          { $gt: ["$netAmount", "$paidAmount"] },
        ],
      };
    if (status === "due") q.paidAmount = { $lte: 0 };

    const [total, bills] = await Promise.all([
      PharmacyBill.countDocuments(q),
      PharmacyBill.find(q)
        .populate("patientId", "name patientCode phone")
        .populate("doctorId", "name")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
    ]);
    return apiResponse({
      bills,
      total,
      totalPages: Math.ceil(total / limit),
      page,
    });
  }

  // ── Pathology ─────────────────────────────────────────────────────────────────
  if (module === "pathology") {
    const ptIds = await patientFilter(tid, search);
    if (ptIds && ptIds.length === 0)
      return apiResponse({ bills: [], total: 0, totalPages: 0, page });

    const q: Record<string, unknown> = {
      tenantId: tid,
      billDate: strRange(from, to),
    };
    if (ptIds) q.patientId = { $in: ptIds };
    if (status === "paid") q.balance = 0;
    if (status === "partial") {
      q.balance = { $gt: 0 };
      q.paidAmount = { $gt: 0 };
    }
    if (status === "due") q.paidAmount = { $lte: 0 };

    const [total, bills] = await Promise.all([
      PathologyBill.countDocuments(q),
      PathologyBill.find(q)
        .populate("patientId", "name patientCode phone")
        .sort({ billDate: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
    ]);
    return apiResponse({
      bills,
      total,
      totalPages: Math.ceil(total / limit),
      page,
    });
  }

  // ── Radiology ─────────────────────────────────────────────────────────────────
  if (module === "radiology") {
    const ptIds = await patientFilter(tid, search);
    if (ptIds && ptIds.length === 0)
      return apiResponse({ bills: [], total: 0, totalPages: 0, page });

    const q: Record<string, unknown> = {
      tenantId: tid,
      billDate: strRange(from, to),
    };
    if (ptIds) q.patientId = { $in: ptIds };
    if (status === "paid") q.balance = 0;
    if (status === "partial") {
      q.balance = { $gt: 0 };
      q.paidAmount = { $gt: 0 };
    }
    if (status === "due") q.paidAmount = { $lte: 0 };

    const [total, bills] = await Promise.all([
      RadiologyBill.countDocuments(q),
      RadiologyBill.find(q)
        .populate("patientId", "name patientCode phone")
        .sort({ billDate: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
    ]);
    return apiResponse({
      bills,
      total,
      totalPages: Math.ceil(total / limit),
      page,
    });
  }

  // ── IPD ─────────────────────────────────────────────────────────────────────
  if (module === "ipd") {
    const ptIds = await patientFilter(tid, search);
    if (ptIds && ptIds.length === 0)
      return apiResponse({ bills: [], total: 0, totalPages: 0, page });

    const q: Record<string, unknown> = {
      tenantId: tid,
      admissionDate: strRange(from, to),
    };
    if (ptIds) q.patientId = { $in: ptIds };

    const [total, admissions] = await Promise.all([
      IpdAdmission.countDocuments(q),
      IpdAdmission.find(q)
        .populate("patientId", "name patientCode age gender phone")
        .populate("doctorId", "name specialization")
        .sort({ admissionDate: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
    ]);

    const ipdIds = admissions.map((a) => a._id);

    const [chargeAgg, paymentAgg] = await Promise.all([
      IpdCharge.aggregate([
        { $match: { ipdId: { $in: ipdIds } } },
        { $group: { _id: "$ipdId", totalCharges: { $sum: "$total" } } },
      ]),
      IpdPayment.aggregate([
        { $match: { ipdId: { $in: ipdIds } } },
        { $group: { _id: "$ipdId", totalPaid: { $sum: "$amount" } } },
      ]),
    ]);

    const chargesMap: Record<string, number> = {};
    const paidMap: Record<string, number> = {};
    for (const r of chargeAgg) chargesMap[String(r._id)] = r.totalCharges;
    for (const r of paymentAgg) paidMap[String(r._id)] = r.totalPaid;

    const bills = admissions.map((a) => {
      const id = String(a._id);
      const totalCharges = chargesMap[id] ?? 0;
      const totalPaid = paidMap[id] ?? 0;
      return {
        ...a.toObject(),
        totalCharges,
        totalPaid,
        balance: totalCharges - totalPaid,
      };
    });

    return apiResponse({
      bills,
      total,
      totalPages: Math.ceil(total / limit),
      page,
    });
  }

  return apiError("Unknown module", 400);
}
