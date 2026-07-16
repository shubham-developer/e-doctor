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

// Classifies visits into free revisits and paid (charged) revisits.
// A visit is a "revisit" when the patient has ANY earlier OPD visit (visits
// are ordered by visitDate then opdNumber, so same-day visits count as priors
// for each other). Free vs charged reflects what was actually billed on the
// visit itself (totalFee/paidAmount), not a re-simulation of the free-revisit
// eligibility rules — so the badge always agrees with the Amount column even
// for overrides or visits created under older settings.
// daysSince maps revisit id -> days since that patient's previous visit.
async function classifyOpdVisits(
  tenantId: mongoose.Types.ObjectId,
  visits: Array<{ _id: unknown; patientId: unknown; visitDate: string }>,
): Promise<{
  freeIds: Set<string>;
  paidIds: Set<string>;
  daysSince: Map<string, number>;
}> {
  const empty = {
    freeIds: new Set<string>(),
    paidIds: new Set<string>(),
    daysSince: new Map<string, number>(),
  };
  if (visits.length === 0) return empty;

  const maxDate = visits.reduce(
    (m, v) => (v.visitDate > m ? v.visitDate : m),
    visits[0].visitDate,
  );

  const patientIds = [
    ...new Set(visits.map((v) => v.patientId)),
  ] as mongoose.Types.ObjectId[];
  const extended = await OpdVisit.find({
    tenantId,
    patientId: { $in: patientIds },
    visitDate: { $lte: maxDate },
  })
    .select("patientId visitDate opdNumber paidAmount totalFee")
    .lean();

  type Entry = { id: string; date: string; opdNumber: number; paid: boolean };
  const byPatient = new Map<string, Entry[]>();
  for (const v of extended) {
    const pid = String(v.patientId);
    if (!byPatient.has(pid)) byPatient.set(pid, []);
    byPatient.get(pid)!.push({
      id: String(v._id),
      date: String(v.visitDate).slice(0, 10),
      opdNumber: (v as { opdNumber?: number }).opdNumber ?? 0,
      paid:
        ((v as { paidAmount?: number }).paidAmount ?? 0) > 0 ||
        ((v as { totalFee?: number }).totalFee ?? 0) > 0,
    });
  }
  for (const entries of byPatient.values()) {
    entries.sort(
      (a, b) => a.date.localeCompare(b.date) || a.opdNumber - b.opdNumber,
    );
  }

  const freeIds = new Set<string>();
  const paidIds = new Set<string>();
  const daysSince = new Map<string, number>();
  for (const v of visits) {
    const id = String(v._id);
    const entries = byPatient.get(String(v.patientId)) ?? [];
    const idx = entries.findIndex((e) => e.id === id);
    if (idx <= 0) continue; // first-ever visit (or not found) → new

    const vDate = entries[idx].date;
    const lastVisit = entries[idx - 1];
    daysSince.set(
      id,
      Math.round(
        (new Date(vDate).getTime() - new Date(lastVisit.date).getTime()) /
          86400000,
      ),
    );

    if (entries[idx].paid) paidIds.add(id);
    else freeIds.add(id);
  }
  return { freeIds, paidIds, daysSince };
}

// Hard cap for `limit=all` (CSV export / print of the full date range).
const EXPORT_CAP = 5000;

function pageParams(sp: URLSearchParams) {
  const all = sp.get("limit") === "all";
  const page = all ? 1 : Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1);
  const limit = all
    ? EXPORT_CAP
    : Math.min(100, Math.max(1, parseInt(sp.get("limit") ?? "25", 10) || 25));
  return { page, limit, skip: all ? 0 : (page - 1) * limit };
}

// Maps a client sortKey to a real document field; unknown keys fall back so
// derived/populated columns can't inject arbitrary sort fields.
function sortSpec(
  sp: URLSearchParams,
  allowed: Record<string, string>,
  fallback: Record<string, 1 | -1>,
): Record<string, 1 | -1> {
  const field = allowed[sp.get("sortKey") ?? ""];
  if (!field) return fallback;
  const spec: Record<string, 1 | -1> = {
    [field]: sp.get("sortDir") === "desc" ? -1 : 1,
  };
  spec.createdAt = spec.createdAt ?? 1;
  return spec;
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
      const query = { tenantId: tid, visitDate: dateRange(from, to) };
      const { limit, skip } = pageParams(sp);
      const sort = sortSpec(
        sp,
        { date: "visitDate", amount: "paidAmount" },
        { visitDate: 1, createdAt: 1 },
      );

      // Full-range slim list: drives revisit classification, stat-card counts
      // and the amount total, independent of the page being viewed.
      const rawAll = (await OpdVisit.find(query)
        .select("patientId visitDate paidAmount")
        .lean()) as unknown as Array<{
        _id: unknown;
        patientId: unknown;
        visitDate: string;
        paidAmount?: number;
      }>;
      const { freeIds, paidIds, daysSince } = await classifyOpdVisits(
        tid,
        rawAll,
      );
      const totalAmount = rawAll.reduce((s, v) => s + (v.paidAmount ?? 0), 0);

      const visits = await OpdVisit.find(query)
        .populate("patientId", "name uhid age gender phone")
        .populate("doctorId", "name specialization")
        .sort(sort)
        .skip(skip)
        .limit(limit);
      const result = visits.map((v) => {
        const id = String(v._id);
        const visitStatus = freeIds.has(id)
          ? "free_revisit"
          : paidIds.has(id)
            ? "paid_revisit"
            : "new";
        return {
          ...v.toObject(),
          visitStatus,
          isReturning: freeIds.has(id),
          daysSinceLastVisit: daysSince.get(id) ?? null,
        };
      });
      return apiResponse({
        visits: result,
        total: rawAll.length,
        freeRevisitCount: freeIds.size,
        paidRevisitCount: paidIds.size,
        totalAmount: Math.round(totalAmount * 100) / 100,
      });
    }

    // ── IPD detail ────────────────────────────────────────────────────────────
    if (type === "ipd") {
      // Show all admissions active during the selected range:
      // admitted on or before `to`, and (still admitted OR discharged on/after `from`)
      const query = {
        tenantId: tid,
        admissionDate: { $lte: to + "T23:59:59" },
        $or: [{ status: "ADMITTED" }, { dischargeDate: { $gte: from } }],
      };
      const { limit, skip } = pageParams(sp);
      const sort = sortSpec(
        sp,
        {
          ipdNumber: "ipdNumber",
          admissionDate: "admissionDate",
          dischargeDate: "dischargeDate",
          status: "status",
        },
        { admissionDate: -1 },
      );

      const [allIds, admissions] = await Promise.all([
        IpdAdmission.find(query).select("_id").lean(),
        IpdAdmission.find(query)
          .populate("patientId", "name uhid age gender phone")
          .populate("doctorId", "name specialization")
          .sort(sort)
          .skip(skip)
          .limit(limit),
      ]);

      const ipdIds = allIds.map((a) => a._id);

      // Payments/charges for every admission in range (full stay totals), so
      // the footer totals cover the whole range, not just the current page.
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
      const totalPaid = payments.reduce((s, p) => s + p.totalPaid, 0);
      const totalCharges = charges.reduce((s, c) => s + c.totalCharges, 0);

      return apiResponse({
        admissions,
        paidByIpd,
        chargesByIpd,
        total: allIds.length,
        totalPaid: Math.round(totalPaid * 100) / 100,
        totalCharges: Math.round(totalCharges * 100) / 100,
      });
    }

    // ── Pharmacy / Pathology / Radiology detail ───────────────────────────────
    if (type === "pharmacy" || type === "pathology" || type === "radiology") {
      const Model = (type === "pharmacy"
        ? PharmacyBill
        : type === "pathology"
          ? PathologyBill
          : RadiologyBill) as unknown as mongoose.Model<
        Record<string, unknown>
      >;
      // PharmacyBill has no string billDate field — it filters/sorts on createdAt.
      const dateField = type === "pharmacy" ? "createdAt" : "billDate";
      const query =
        type === "pharmacy"
          ? { tenantId: tid, createdAt: dateObjRange(from, to) }
          : { tenantId: tid, billDate: dateRange(from, to) };
      const { limit, skip } = pageParams(sp);
      const sort = sortSpec(
        sp,
        {
          date: dateField,
          billNo: "billNo",
          amount: "amount",
          net: "netAmount",
          paid: "paidAmount",
        },
        type === "pharmacy" ? { createdAt: 1 } : { billDate: 1, createdAt: 1 },
      );

      const [bills, totalsAgg] = await Promise.all([
        Model.find(query)
          .populate("patientId", "name uhid")
          .sort(sort)
          .skip(skip)
          .limit(limit),
        Model.aggregate([
          { $match: query },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              paid: { $sum: { $ifNull: ["$paidAmount", 0] } },
              balance: {
                $sum: {
                  $ifNull: [
                    "$balance",
                    {
                      $subtract: [
                        { $ifNull: ["$netAmount", 0] },
                        { $ifNull: ["$paidAmount", 0] },
                      ],
                    },
                  ],
                },
              },
            },
          },
        ]),
      ]);
      const totals = totalsAgg[0] ?? { count: 0, paid: 0, balance: 0 };
      return apiResponse({
        bills,
        total: totals.count,
        totalPaid: Math.round(totals.paid * 100) / 100,
        totalBalance: Math.round(totals.balance * 100) / 100,
      });
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
          if (!userMap[name][mode])
            userMap[name][mode] = { amount: 0, count: 0 };
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
          $group: {
            _id: null,
            count: { $sum: 1 },
            amount: { $sum: "$amount" },
          },
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
        {
          $group: {
            _id: "$visitDate",
            amount: { $sum: { $ifNull: ["$appliedCharge", "$totalFee"] } },
          },
        },
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
        dailyMap[d] = {
          opd: 0,
          pharmacy: 0,
          pathology: 0,
          radiology: 0,
          ipd: 0,
        };
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
    const rad = radAgg[0] ?? {
      count: 0,
      amount: 0,
      net: 0,
      paid: 0,
      balance: 0,
    };
    const ipdP = ipdPayAgg[0] ?? { count: 0, amount: 0 };

    const { freeIds: summaryFreeIds, paidIds: summaryPaidIds } =
      await classifyOpdVisits(
        tid,
        opdVisitsForReturning as Array<{
          _id: unknown;
          patientId: unknown;
          visitDate: string;
        }>,
      );

    return apiResponse({
      period: { from, to },
      opd: {
        count: opd.count,
        amount: Math.round(opd.amount * 100) / 100,
        freeRevisitCount: summaryFreeIds.size,
        paidRevisitCount: summaryPaidIds.size,
      },
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
    return apiError(
      err instanceof Error ? err.message : "Internal server error",
      500,
    );
  }
}
