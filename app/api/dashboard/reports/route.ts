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
import Tenant from "@/models/Tenant";
import "@/models/Patient";
import "@/models/Staff";
import { apiResponse, apiError } from "@/lib/api";
import { todayString } from "@/lib/format";

function dateRange(from: string, to: string) {
  // T23:59:59 suffix covers datetime-stored fields (e.g. admissionDate "2026-07-03T18:08").
  // Plain date strings ("2026-07-03") remain <= "2026-07-03T23:59:59".
  return { $gte: from, $lte: to + "T23:59:59" };
}

// PharmacyBill stores createdAt as a Date object, not a string billDate field.
function dateObjRange(from: string, to: string) {
  return {
    $gte: new Date(from + "T00:00:00.000Z"),
    $lte: new Date(to + "T23:59:59.999Z"),
  };
}

// Classifies visits into free revisits and paid-but-returning revisits.
// A visit is a "revisit" when the same patient had priorCount > 0 visits within the window.
// A revisit is "free" when priorCount <= freeRevisits; otherwise it's "paid returning".
async function classifyOpdVisits(
  tenantId: mongoose.Types.ObjectId,
  visits: Array<{ _id: unknown; patientId: unknown; visitDate: string }>,
  revisitDays: number,
  freeRevisits: number,
): Promise<{ freeIds: Set<string>; paidIds: Set<string> }> {
  const empty = { freeIds: new Set<string>(), paidIds: new Set<string>() };
  if (revisitDays <= 0 || visits.length === 0) return empty;

  const minDate = visits.reduce((m, v) => (v.visitDate < m ? v.visitDate : m), visits[0].visitDate);
  const maxDate = visits.reduce((m, v) => (v.visitDate > m ? v.visitDate : m), visits[0].visitDate);
  const cutoff = new Date(minDate);
  cutoff.setDate(cutoff.getDate() - revisitDays);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const patientIds = [...new Set(visits.map((v) => v.patientId))] as mongoose.Types.ObjectId[];
  const extended = await OpdVisit.find({
    tenantId,
    patientId: { $in: patientIds },
    visitDate: { $gte: cutoffStr, $lte: maxDate },
  })
    .select("patientId visitDate")
    .lean();

  const byPatient = new Map<string, string[]>();
  for (const v of extended) {
    const pid = String(v.patientId);
    const d = String(v.visitDate).slice(0, 10);
    if (!byPatient.has(pid)) byPatient.set(pid, []);
    byPatient.get(pid)!.push(d);
  }
  for (const dates of byPatient.values()) dates.sort();

  const freeIds = new Set<string>();
  const paidIds = new Set<string>();
  for (const v of visits) {
    const pid = String(v.patientId);
    const vDate = String(v.visitDate).slice(0, 10);
    const windowStart = new Date(vDate);
    windowStart.setDate(windowStart.getDate() - revisitDays);
    const windowStartStr = windowStart.toISOString().slice(0, 10);
    const priorCount = (byPatient.get(pid) ?? []).filter((d) => d >= windowStartStr && d < vDate).length;
    if (priorCount > 0) {
      if (freeRevisits <= 0 || priorCount <= freeRevisits) {
        freeIds.add(String(v._id));
      } else {
        paidIds.add(String(v._id));
      }
    }
  }
  return { freeIds, paidIds };
}

export async function GET(req: NextRequest) {
  try {
  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return apiError("Unauthorized", 401);

  await connectDB();

  const sp = req.nextUrl.searchParams;
  const type = sp.get("type") ?? "summary";
  const from = sp.get("from") ?? todayString();
  const to = sp.get("to") ?? todayString();
  const tid = new mongoose.Types.ObjectId(tenantId);

  // ── OPD detail ────────────────────────────────────────────────────────────
  if (type === "opd") {
    const [visits, tenant] = await Promise.all([
      OpdVisit.find({ tenantId: tid, visitDate: dateRange(from, to) })
        .populate("patientId", "name uhid age gender phone")
        .populate("doctorId", "name specialization")
        .sort({ visitDate: 1, createdAt: 1 })
        .limit(1000),
      Tenant.findById(tenantId).select("opdRevisitDays").lean(),
    ]);
    const t = tenant as { opdRevisitDays?: number; opdFreeRevisits?: number } | null;
    const revisitDays = t?.opdRevisitDays ?? 0;
    const freeRevisits = t?.opdFreeRevisits ?? 0;
    const rawVisits = visits.map((v) => ({ _id: v._id, patientId: (v.patientId as { _id: unknown } | null)?._id ?? v.patientId, visitDate: v.visitDate as string }));
    const { freeIds, paidIds } = await classifyOpdVisits(tid, rawVisits, revisitDays, freeRevisits);
    const result = visits.map((v) => {
      const id = String(v._id);
      const visitStatus = freeIds.has(id) ? "free_revisit" : paidIds.has(id) ? "paid_revisit" : "new";
      return { ...v.toObject(), visitStatus, isReturning: freeIds.has(id) };
    });
    return apiResponse({ visits: result, total: result.length, freeRevisitCount: freeIds.size, paidRevisitCount: paidIds.size });
  }

  // ── IPD detail ────────────────────────────────────────────────────────────
  if (type === "ipd") {
    // Show all admissions active during the selected range:
    // admitted on or before `to`, and (still admitted OR discharged on/after `from`)
    const admissions = await IpdAdmission.find({
      tenantId: tid,
      admissionDate: { $lte: to + "T23:59:59" },
      $or: [
        { status: "ADMITTED" },
        { dischargeDate: { $gte: from } },
      ],
    })
      .populate("patientId", "name uhid age gender phone")
      .populate("doctorId", "name specialization")
      .sort({ admissionDate: -1 })
      .limit(500);

    const ipdIds = admissions.map((a) => a._id);

    // Fetch all payments and charges for these admissions (full stay totals)
    const [payments, charges] = await Promise.all([
      IpdPayment.aggregate([
        { $match: { tenantId: tid, ipdId: { $in: ipdIds } } },
        { $group: { _id: "$ipdId", totalPaid: { $sum: "$amount" } } },
      ]),
      IpdCharge.aggregate([
        { $match: { tenantId: tid, ipdId: { $in: ipdIds } } },
        { $group: { _id: "$ipdId", totalCharges: { $sum: "$total" } } },
      ]),
    ]);

    const paidByIpd: Record<string, number> = {};
    for (const p of payments) paidByIpd[String(p._id)] = p.totalPaid;
    const chargesByIpd: Record<string, number> = {};
    for (const c of charges) chargesByIpd[String(c._id)] = c.totalCharges;

    return apiResponse({ admissions, paidByIpd, chargesByIpd, total: admissions.length });
  }

  // ── Pharmacy detail ───────────────────────────────────────────────────────
  if (type === "pharmacy") {
    const bills = await PharmacyBill.find({
      tenantId: tid,
      createdAt: dateObjRange(from, to),
    })
      .populate("patientId", "name uhid")
      .sort({ createdAt: 1 })
      .limit(1000);
    return apiResponse({ bills, total: bills.length });
  }

  // ── Pathology detail ──────────────────────────────────────────────────────
  if (type === "pathology") {
    const bills = await PathologyBill.find({
      tenantId: tid,
      billDate: dateRange(from, to),
    })
      .populate("patientId", "name uhid")
      .sort({ billDate: 1, createdAt: 1 })
      .limit(1000);
    return apiResponse({ bills, total: bills.length });
  }

  // ── Radiology detail ──────────────────────────────────────────────────────
  if (type === "radiology") {
    const bills = await RadiologyBill.find({
      tenantId: tid,
      billDate: dateRange(from, to),
    })
      .populate("patientId", "name uhid")
      .sort({ billDate: 1, createdAt: 1 })
      .limit(1000);
    return apiResponse({ bills, total: bills.length });
  }

  // ── Collections by user ───────────────────────────────────────────────────
  if (type === "collections") {
    // Group by {user, paymentMode} so we can pivot per-user payment modes
    const [opd, phar, path, rad, ipd] = await Promise.all([
      OpdVisit.aggregate([
        { $match: { tenantId: tid, visitDate: dateRange(from, to) } },
        {
          $group: {
            _id: { name: "$createdBy.name", mode: "$paymentMode" },
            count: { $sum: 1 },
            amount: { $sum: { $ifNull: ["$appliedCharge", "$totalFee"] } },
          },
        },
      ]),
      PharmacyBill.aggregate([
        { $match: { tenantId: tid, createdAt: dateObjRange(from, to) } },
        {
          $group: {
            _id: { name: "$createdBy.name", mode: "$paymentMode" },
            count: { $sum: 1 },
            amount: { $sum: "$paidAmount" },
          },
        },
      ]),
      PathologyBill.aggregate([
        { $match: { tenantId: tid, billDate: dateRange(from, to) } },
        {
          $group: {
            _id: { name: "$createdBy.name", mode: "$paymentMode" },
            count: { $sum: 1 },
            amount: { $sum: "$paidAmount" },
          },
        },
      ]),
      RadiologyBill.aggregate([
        { $match: { tenantId: tid, billDate: dateRange(from, to) } },
        {
          $group: {
            _id: { name: "$createdBy.name", mode: "$paymentMode" },
            count: { $sum: 1 },
            amount: { $sum: "$paidAmount" },
          },
        },
      ]),
      IpdPayment.aggregate([
        { $match: { tenantId: tid, date: dateRange(from, to) } },
        {
          $group: {
            _id: { name: "$addedByName", mode: "$paymentMode" },
            count: { $sum: 1 },
            amount: { $sum: "$amount" },
          },
        },
      ]),
    ]);

    // Pivot: userMap[name][mode] = { amount, count }
    type ModeMap = Record<string, { amount: number; count: number }>;
    const userMap: Record<string, ModeMap> = {};

    const push = (
      rows: {
        _id: { name: string; mode: string };
        count: number;
        amount: number;
      }[],
    ) => {
      for (const r of rows) {
        const name = r._id?.name;
        const mode = (r._id?.mode || "CASH").toUpperCase();
        if (!name) continue;
        if (!userMap[name]) userMap[name] = {};
        if (!userMap[name][mode]) userMap[name][mode] = { amount: 0, count: 0 };
        userMap[name][mode].amount += r.amount;
        userMap[name][mode].count += r.count;
      }
    };
    push(opd);
    push(phar);
    push(path);
    push(rad);
    push(ipd);

    // Collect all unique modes (sorted: CASH first, then alphabetically)
    const modeSet = new Set<string>();
    for (const modes of Object.values(userMap))
      for (const m of Object.keys(modes)) modeSet.add(m);
    const allModes = [...modeSet].sort((a, b) => {
      if (a === "CASH") return -1;
      if (b === "CASH") return 1;
      return a.localeCompare(b);
    });

    // Build flat per-user rows
    const collections = Object.entries(userMap)
      .map(([name, modes]) => {
        const modeAmounts: Record<string, number> = {};
        const modeCounts: Record<string, number> = {};
        let total = 0,
          count = 0;
        for (const m of allModes) {
          modeAmounts[m] = Math.round((modes[m]?.amount ?? 0) * 100) / 100;
          modeCounts[m] = modes[m]?.count ?? 0;
          total += modeAmounts[m];
          count += modeCounts[m];
        }
        return {
          name,
          modeAmounts,
          modeCounts,
          total: Math.round(total * 100) / 100,
          count,
        };
      })
      .sort((a, b) => b.total - a.total);

    // Grand totals per mode
    const modeTotals: Record<string, number> = {};
    const modeCounts: Record<string, number> = {};
    for (const m of allModes) {
      modeTotals[m] =
        Math.round(
          collections.reduce((s, r) => s + (r.modeAmounts[m] ?? 0), 0) * 100,
        ) / 100;
      modeCounts[m] = collections.reduce(
        (s, r) => s + (r.modeCounts[m] ?? 0),
        0,
      );
    }
    const grandTotal =
      Math.round(collections.reduce((s, r) => s + r.total, 0) * 100) / 100;
    const grandCount = collections.reduce((s, r) => s + r.count, 0);

    return apiResponse({
      collections,
      allModes,
      modeTotals,
      modeCounts,
      grandTotal,
      grandCount,
    });
  }

  // ── Summary (default) ─────────────────────────────────────────────────────
  const summaryTenant = await Tenant.findById(tenantId).select("opdRevisitDays opdFreeRevisits").lean();
  const summaryT = summaryTenant as { opdRevisitDays?: number; opdFreeRevisits?: number } | null;
  const summaryRevisitDays = summaryT?.opdRevisitDays ?? 0;
  const summaryFreeRevisits = summaryT?.opdFreeRevisits ?? 0;
  const [
    opdAgg,
    pharAgg,
    pathAgg,
    radAgg,
    ipdAdmAgg,
    ipdDisAgg,
    ipdPayAgg,
    opdModeAgg,
    pharModeAgg,
    pathModeAgg,
    radModeAgg,
    ipdModeAgg,
    opdDaily,
    pharDaily,
    pathDaily,
    radDaily,
    ipdDaily,
    opdVisitsForReturning,
  ] = await Promise.all([
    // Totals
    OpdVisit.aggregate([
      { $match: { tenantId: tid, visitDate: dateRange(from, to) } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          amount: { $sum: { $ifNull: ["$appliedCharge", "$totalFee"] } },
        },
      },
    ]),
    PharmacyBill.aggregate([
      { $match: { tenantId: tid, createdAt: dateObjRange(from, to) } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          amount: { $sum: "$amount" },
          net: { $sum: "$netAmount" },
          paid: { $sum: "$paidAmount" },
          balance: { $sum: "$balance" },
        },
      },
    ]),
    PathologyBill.aggregate([
      { $match: { tenantId: tid, billDate: dateRange(from, to) } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          amount: { $sum: "$amount" },
          net: { $sum: "$netAmount" },
          paid: { $sum: "$paidAmount" },
          balance: { $sum: "$balance" },
        },
      },
    ]),
    RadiologyBill.aggregate([
      { $match: { tenantId: tid, billDate: dateRange(from, to) } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          amount: { $sum: "$amount" },
          net: { $sum: "$netAmount" },
          paid: { $sum: "$paidAmount" },
          balance: { $sum: "$balance" },
        },
      },
    ]),
    IpdAdmission.countDocuments({
      tenantId: tid,
      admissionDate: dateRange(from, to),
    }),
    IpdAdmission.countDocuments({
      tenantId: tid,
      dischargeDate: dateRange(from, to),
    }),
    IpdPayment.aggregate([
      { $match: { tenantId: tid, date: dateRange(from, to) } },
      {
        $group: { _id: null, count: { $sum: 1 }, amount: { $sum: "$amount" } },
      },
    ]),
    // Payment mode breakdown
    OpdVisit.aggregate([
      { $match: { tenantId: tid, visitDate: dateRange(from, to) } },
      {
        $group: {
          _id: "$paymentMode",
          count: { $sum: 1 },
          amount: { $sum: { $ifNull: ["$appliedCharge", "$totalFee"] } },
        },
      },
    ]),
    PharmacyBill.aggregate([
      { $match: { tenantId: tid, createdAt: dateObjRange(from, to) } },
      {
        $group: {
          _id: "$paymentMode",
          count: { $sum: 1 },
          amount: { $sum: "$paidAmount" },
        },
      },
    ]),
    PathologyBill.aggregate([
      { $match: { tenantId: tid, billDate: dateRange(from, to) } },
      {
        $group: {
          _id: "$paymentMode",
          count: { $sum: 1 },
          amount: { $sum: "$paidAmount" },
        },
      },
    ]),
    RadiologyBill.aggregate([
      { $match: { tenantId: tid, billDate: dateRange(from, to) } },
      {
        $group: {
          _id: "$paymentMode",
          count: { $sum: 1 },
          amount: { $sum: "$paidAmount" },
        },
      },
    ]),
    IpdPayment.aggregate([
      { $match: { tenantId: tid, date: dateRange(from, to) } },
      {
        $group: {
          _id: "$paymentMode",
          count: { $sum: 1 },
          amount: { $sum: "$amount" },
        },
      },
    ]),
    // Daily breakdown
    OpdVisit.aggregate([
      { $match: { tenantId: tid, visitDate: dateRange(from, to) } },
      { $group: { _id: "$visitDate", amount: { $sum: { $ifNull: ["$appliedCharge", "$totalFee"] } } } },
    ]),
    PharmacyBill.aggregate([
      { $match: { tenantId: tid, createdAt: dateObjRange(from, to) } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          amount: { $sum: "$paidAmount" },
        },
      },
    ]),
    PathologyBill.aggregate([
      { $match: { tenantId: tid, billDate: dateRange(from, to) } },
      { $group: { _id: "$billDate", amount: { $sum: "$paidAmount" } } },
    ]),
    RadiologyBill.aggregate([
      { $match: { tenantId: tid, billDate: dateRange(from, to) } },
      { $group: { _id: "$billDate", amount: { $sum: "$paidAmount" } } },
    ]),
    IpdPayment.aggregate([
      { $match: { tenantId: tid, date: dateRange(from, to) } },
      { $group: { _id: "$date", amount: { $sum: "$amount" } } },
    ]),
    // Minimal visit list for returning-patient count
    OpdVisit.find({ tenantId: tid, visitDate: dateRange(from, to) })
      .select("patientId visitDate")
      .lean(),
  ]);

  // Build daily map
  const dailyMap: Record<
    string,
    {
      opd: number;
      pharmacy: number;
      pathology: number;
      radiology: number;
      ipd: number;
    }
  > = {};
  const ensureDay = (d: string) => {
    if (!dailyMap[d])
      dailyMap[d] = { opd: 0, pharmacy: 0, pathology: 0, radiology: 0, ipd: 0 };
  };
  for (const r of opdDaily) {
    ensureDay(r._id);
    dailyMap[r._id].opd = Math.round(r.amount * 100) / 100;
  }
  for (const r of pharDaily) {
    ensureDay(r._id);
    dailyMap[r._id].pharmacy = Math.round(r.amount * 100) / 100;
  }
  for (const r of pathDaily) {
    ensureDay(r._id);
    dailyMap[r._id].pathology = Math.round(r.amount * 100) / 100;
  }
  for (const r of radDaily) {
    ensureDay(r._id);
    dailyMap[r._id].radiology = Math.round(r.amount * 100) / 100;
  }
  for (const r of ipdDaily) {
    ensureDay(r._id);
    dailyMap[r._id].ipd = Math.round(r.amount * 100) / 100;
  }
  const daily = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({
      date,
      ...v,
      total:
        Math.round(
          (v.opd + v.pharmacy + v.pathology + v.radiology + v.ipd) * 100,
        ) / 100,
    }));

  // Merge payment modes across all modules
  const modeMap: Record<string, { count: number; amount: number }> = {};
  const addMode = (arr: { _id: string; count: number; amount: number }[]) => {
    for (const r of arr) {
      const key = (r._id || "CASH").toUpperCase();
      if (!modeMap[key]) modeMap[key] = { count: 0, amount: 0 };
      modeMap[key].count += r.count;
      modeMap[key].amount += r.amount;
    }
  };
  addMode(opdModeAgg);
  addMode(pharModeAgg);
  addMode(pathModeAgg);
  addMode(radModeAgg);
  addMode(ipdModeAgg);
  const paymentModes = Object.entries(modeMap)
    .map(([mode, v]) => ({
      mode,
      count: v.count,
      amount: Math.round(v.amount * 100) / 100,
    }))
    .sort((a, b) => b.amount - a.amount);

  const opd = opdAgg[0] ?? { count: 0, amount: 0 };
  const phar = pharAgg[0] ?? {
    count: 0,
    amount: 0,
    net: 0,
    paid: 0,
    balance: 0,
  };
  const path = pathAgg[0] ?? {
    count: 0,
    amount: 0,
    net: 0,
    paid: 0,
    balance: 0,
  };
  const rad = radAgg[0] ?? { count: 0, amount: 0, net: 0, paid: 0, balance: 0 };
  const ipdP = ipdPayAgg[0] ?? { count: 0, amount: 0 };

  const { freeIds: summaryFreeIds, paidIds: summaryPaidIds } = await classifyOpdVisits(
    tid,
    (opdVisitsForReturning as Array<{ _id: unknown; patientId: unknown; visitDate: string }>),
    summaryRevisitDays,
    summaryFreeRevisits,
  );

  return apiResponse({
    period: { from, to },
    opd: { count: opd.count, amount: Math.round(opd.amount * 100) / 100, freeRevisitCount: summaryFreeIds.size, paidRevisitCount: summaryPaidIds.size },
    pharmacy: {
      count: phar.count,
      amount: Math.round(phar.amount * 100) / 100,
      net: Math.round(phar.net * 100) / 100,
      paid: Math.round(phar.paid * 100) / 100,
      balance: Math.round(phar.balance * 100) / 100,
    },
    pathology: {
      count: path.count,
      amount: Math.round(path.amount * 100) / 100,
      net: Math.round(path.net * 100) / 100,
      paid: Math.round(path.paid * 100) / 100,
      balance: Math.round(path.balance * 100) / 100,
    },
    radiology: {
      count: rad.count,
      amount: Math.round(rad.amount * 100) / 100,
      net: Math.round(rad.net * 100) / 100,
      paid: Math.round(rad.paid * 100) / 100,
      balance: Math.round(rad.balance * 100) / 100,
    },
    ipd: {
      admissions: ipdAdmAgg,
      discharges: ipdDisAgg,
      payments: Math.round(ipdP.amount * 100) / 100,
      paymentCount: ipdP.count,
    },
    total:
      Math.round(
        (opd.amount + phar.paid + path.paid + rad.paid + ipdP.amount) * 100,
      ) / 100,
    daily,
    paymentModes,
  });
  } catch (err) {
    console.error("[reports] unhandled error:", err);
    return apiError(err instanceof Error ? err.message : "Internal server error", 500);
  }
}
