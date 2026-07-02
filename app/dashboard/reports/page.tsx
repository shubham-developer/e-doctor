'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '@/lib/apiClient'
import { useApp } from '@/lib/context'
import { todayString } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Calendar, Printer, TrendingUp, Users, Activity,
  Pill, FlaskConical, Stethoscope, BedDouble, RefreshCw,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Summary {
  period: { from: string; to: string }
  opd:      { count: number; amount: number }
  pharmacy: { count: number; amount: number; net: number; paid: number; balance: number }
  pathology:{ count: number; amount: number; net: number; paid: number; balance: number }
  radiology:{ count: number; amount: number; net: number; paid: number; balance: number }
  ipd:      { admissions: number; discharges: number; payments: number; paymentCount: number }
  total: number
  daily: { date: string; opd: number; pharmacy: number; pathology: number; radiology: number; ipd: number; total: number }[]
  paymentModes: { mode: string; count: number; amount: number }[]
}

interface OpdVisit {
  _id: string; visitDate: string; paidAmount: number; paymentMode?: string
  patientId?: { name: string; patientCode?: string; age?: number; gender?: string; phone?: string }
  doctorId?:  { name: string; specialization?: string }
  visitType?: string; createdBy?: { name: string }
}

interface BillRow {
  _id: string; billDate: string; billNo: string
  amount: number; netAmount: number; paidAmount: number; balance: number
  paymentMode?: string; discountAmount?: number
  patientId?: { name: string; patientCode?: string }
  createdBy?: { name: string }
}

interface IpdAdm {
  _id: string; admissionDate: string; dischargeDate?: string; ipdNumber?: number; status?: string
  caseNumber?: string
  patientId?: { name: string; patientCode?: string; age?: number; gender?: string; phone?: string }
  doctorId?:  { name: string; specialization?: string }
}

interface CollectionRow {
  name: string; opd: number; pharmacy: number; pathology: number; radiology: number; ipd: number; total: number; count: number
}

// ── Presets ────────────────────────────────────────────────────────────────────

function getPresetRange(preset: string): { from: string; to: string } {
  const today = todayString()
  const d = (offset: number) => {
    const dt = new Date(today)
    dt.setDate(dt.getDate() + offset)
    return dt.toISOString().slice(0, 10)
  }
  const startOfMonth = today.slice(0, 8) + '01'
  switch (preset) {
    case 'today':     return { from: today,     to: today }
    case 'yesterday': return { from: d(-1),     to: d(-1) }
    case '7d':        return { from: d(-6),     to: today }
    case '30d':       return { from: d(-29),    to: today }
    case 'month':     return { from: startOfMonth, to: today }
    default:          return { from: today,     to: today }
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'summary',    label: 'Summary',    icon: TrendingUp  },
  { key: 'opd',        label: 'OPD',        icon: Activity    },
  { key: 'ipd',        label: 'IPD',        icon: BedDouble   },
  { key: 'pharmacy',   label: 'Pharmacy',   icon: Pill        },
  { key: 'pathology',  label: 'Pathology',  icon: FlaskConical},
  { key: 'radiology',  label: 'Radiology',  icon: Stethoscope },
  { key: 'collections',label: 'Collections',icon: Users       },
] as const

type TabKey = typeof TABS[number]['key']

// ── Main Component ─────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { tenant } = useApp()
  const sym = tenant?.currencySymbol ?? '₹'

  const [preset, setPreset]   = useState<string>('today')
  const [from,   setFrom]     = useState(todayString())
  const [to,     setTo]       = useState(todayString())
  const [tab,    setTab]      = useState<TabKey>('summary')
  const [loading, setLoading] = useState(false)

  // data slots
  const [summary,     setSummary]     = useState<Summary | null>(null)
  const [opdRows,     setOpdRows]     = useState<OpdVisit[]>([])
  const [ipdRows,     setIpdRows]     = useState<{ admissions: IpdAdm[]; paidByIpd: Record<string, number> } | null>(null)
  const [pharRows,    setPharRows]    = useState<BillRow[]>([])
  const [pathRows,    setPathRows]    = useState<BillRow[]>([])
  const [radRows,     setRadRows]     = useState<BillRow[]>([])
  const [collections, setCollections] = useState<CollectionRow[]>([])

  const applyPreset = (p: string) => {
    setPreset(p)
    if (p !== 'custom') {
      const r = getPresetRange(p)
      setFrom(r.from)
      setTo(r.to)
    }
  }

  const fmt = (n: number) => `${sym}${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const load = useCallback(async (type: TabKey, f: string, t: string) => {
    setLoading(true)
    const d = await apiClient.get<unknown>(`/api/dashboard/reports?type=${type}&from=${f}&to=${t}`)
    setLoading(false)
    if (!d.success) return

    if (type === 'summary')     setSummary(d.data as Summary)
    else if (type === 'opd')    setOpdRows((d.data as { visits: OpdVisit[] }).visits)
    else if (type === 'ipd')    setIpdRows(d.data as { admissions: IpdAdm[]; paidByIpd: Record<string, number> })
    else if (type === 'pharmacy')  setPharRows((d.data as { bills: BillRow[] }).bills)
    else if (type === 'pathology') setPathRows((d.data as { bills: BillRow[] }).bills)
    else if (type === 'radiology') setRadRows((d.data as { bills: BillRow[] }).bills)
    else if (type === 'collections') setCollections(d.data as CollectionRow[])
  }, [])

  useEffect(() => { load(tab, from, to) }, [tab, from, to, load])

  const handlePrint = () => {
    window.print()
  }

  const PRESETS = [
    { key: 'today',     label: 'Today' },
    { key: 'yesterday', label: 'Yesterday' },
    { key: '7d',        label: 'Last 7 Days' },
    { key: '30d',       label: 'Last 30 Days' },
    { key: 'month',     label: 'This Month' },
    { key: 'custom',    label: 'Custom' },
  ]

  return (
    <div className="p-4 space-y-4 min-h-screen bg-gray-50">
      {/* ── Header ── */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Reports</h1>
          <p className="text-xs text-gray-500">{from === to ? from : `${from} — ${to}`}</p>
        </div>
        <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1.5">
          <Printer className="w-3.5 h-3.5" />
          Print
        </Button>
      </div>

      {/* ── Date Controls ── */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 flex flex-wrap gap-2 items-center print:hidden">
        <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
        {PRESETS.map(p => (
          <button
            key={p.key}
            onClick={() => applyPreset(p.key)}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              preset === p.key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {p.label}
          </button>
        ))}
        {preset === 'custom' && (
          <div className="flex items-center gap-2 ml-2">
            <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="h-7 text-xs w-36" />
            <span className="text-gray-400 text-xs">to</span>
            <Input type="date" value={to}   onChange={e => setTo(e.target.value)}   className="h-7 text-xs w-36" />
          </div>
        )}
        {loading && <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin ml-auto" />}
      </div>

      {/* ── Tabs ── */}
      <div className="flex flex-wrap gap-1 print:hidden">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              tab === key
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Icon className="w-3 h-3" />
            {label}
          </button>
        ))}
      </div>

      {/* ══ SUMMARY ══════════════════════════════════════════════════════════ */}
      {tab === 'summary' && summary && (
        <div className="space-y-4">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiCard label="OPD Visits"      value={summary.opd.count.toString()}  sub={fmt(summary.opd.amount)}      color="blue"  />
            <KpiCard label="IPD Admissions"  value={summary.ipd.admissions.toString()} sub={fmt(summary.ipd.payments)} color="purple"/>
            <KpiCard label="Pharmacy Income" value={fmt(summary.pharmacy.paid)}    sub={`${summary.pharmacy.count} bills`}  color="green" />
            <KpiCard label="Pathology Income"value={fmt(summary.pathology.paid)}   sub={`${summary.pathology.count} bills`} color="orange"/>
            <KpiCard label="Radiology Income"value={fmt(summary.radiology.paid)}   sub={`${summary.radiology.count} bills`} color="red"   />
            <KpiCard label="Total Income"    value={fmt(summary.total)}            sub="all modules" color="teal" bold />
          </div>

          {/* Module breakdown */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Income Breakdown</h3>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500 border-b border-gray-100">
                  <th className="text-left px-4 py-2">Module</th>
                  <th className="text-right px-4 py-2">Count</th>
                  <th className="text-right px-4 py-2">Gross</th>
                  <th className="text-right px-4 py-2">Collected</th>
                  <th className="text-right px-4 py-2">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium text-blue-700">OPD</td>
                  <td className="text-right px-4 py-2">{summary.opd.count}</td>
                  <td className="text-right px-4 py-2">{fmt(summary.opd.amount)}</td>
                  <td className="text-right px-4 py-2 text-green-700">{fmt(summary.opd.amount)}</td>
                  <td className="text-right px-4 py-2">—</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium text-purple-700">IPD</td>
                  <td className="text-right px-4 py-2">{summary.ipd.admissions} adm / {summary.ipd.discharges} dis</td>
                  <td className="text-right px-4 py-2">—</td>
                  <td className="text-right px-4 py-2 text-green-700">{fmt(summary.ipd.payments)}</td>
                  <td className="text-right px-4 py-2">—</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium text-green-700">Pharmacy</td>
                  <td className="text-right px-4 py-2">{summary.pharmacy.count}</td>
                  <td className="text-right px-4 py-2">{fmt(summary.pharmacy.amount)}</td>
                  <td className="text-right px-4 py-2 text-green-700">{fmt(summary.pharmacy.paid)}</td>
                  <td className="text-right px-4 py-2 text-red-600">{fmt(summary.pharmacy.balance)}</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium text-orange-700">Pathology</td>
                  <td className="text-right px-4 py-2">{summary.pathology.count}</td>
                  <td className="text-right px-4 py-2">{fmt(summary.pathology.amount)}</td>
                  <td className="text-right px-4 py-2 text-green-700">{fmt(summary.pathology.paid)}</td>
                  <td className="text-right px-4 py-2 text-red-600">{fmt(summary.pathology.balance)}</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium text-red-700">Radiology</td>
                  <td className="text-right px-4 py-2">{summary.radiology.count}</td>
                  <td className="text-right px-4 py-2">{fmt(summary.radiology.amount)}</td>
                  <td className="text-right px-4 py-2 text-green-700">{fmt(summary.radiology.paid)}</td>
                  <td className="text-right px-4 py-2 text-red-600">{fmt(summary.radiology.balance)}</td>
                </tr>
                <tr className="bg-gray-50 font-semibold">
                  <td className="px-4 py-2 text-gray-800">TOTAL</td>
                  <td className="text-right px-4 py-2">—</td>
                  <td className="text-right px-4 py-2">—</td>
                  <td className="text-right px-4 py-2 text-green-800">{fmt(summary.total)}</td>
                  <td className="text-right px-4 py-2">—</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Payment modes */}
          {summary.paymentModes.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
                <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Payment Mode Breakdown</h3>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-100">
                    <th className="text-left px-4 py-2">Mode</th>
                    <th className="text-right px-4 py-2">Transactions</th>
                    <th className="text-right px-4 py-2">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {summary.paymentModes.map(m => (
                    <tr key={m.mode} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium capitalize">{m.mode || 'Cash'}</td>
                      <td className="text-right px-4 py-2">{m.count}</td>
                      <td className="text-right px-4 py-2 text-green-700">{fmt(m.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Daily trend */}
          {summary.daily.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
                <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Daily Income Trend</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[560px]">
                  <thead>
                    <tr className="text-gray-500 border-b border-gray-100">
                      <th className="text-left px-4 py-2">Date</th>
                      <th className="text-right px-4 py-2">OPD</th>
                      <th className="text-right px-4 py-2">IPD</th>
                      <th className="text-right px-4 py-2">Pharmacy</th>
                      <th className="text-right px-4 py-2">Pathology</th>
                      <th className="text-right px-4 py-2">Radiology</th>
                      <th className="text-right px-4 py-2 font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {summary.daily.map(d => (
                      <tr key={d.date} className="hover:bg-gray-50">
                        <td className="px-4 py-1.5 font-medium">{d.date}</td>
                        <td className="text-right px-4 py-1.5">{d.opd      ? fmt(d.opd)      : '—'}</td>
                        <td className="text-right px-4 py-1.5">{d.ipd      ? fmt(d.ipd)      : '—'}</td>
                        <td className="text-right px-4 py-1.5">{d.pharmacy  ? fmt(d.pharmacy)  : '—'}</td>
                        <td className="text-right px-4 py-1.5">{d.pathology ? fmt(d.pathology) : '—'}</td>
                        <td className="text-right px-4 py-1.5">{d.radiology ? fmt(d.radiology) : '—'}</td>
                        <td className="text-right px-4 py-1.5 font-semibold text-green-700">{fmt(d.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ OPD ══════════════════════════════════════════════════════════════ */}
      {tab === 'opd' && (
        <ReportTable
          title="OPD Report"
          empty={opdRows.length === 0}
          footer={`${opdRows.length} visits · Total: ${fmt(opdRows.reduce((s, r) => s + (r.paidAmount || 0), 0))}`}
          headers={['Date', 'Patient', 'Age / Gender', 'Doctor', 'Visit Type', 'Payment Mode', 'Amount']}
        >
          {opdRows.map(r => (
            <tr key={r._id} className="hover:bg-gray-50">
              <td className="px-4 py-2">{r.visitDate}</td>
              <td className="px-4 py-2">
                <div className="font-medium">{r.patientId?.name ?? '—'}</div>
                {r.patientId?.patientCode && <div className="text-gray-400">{r.patientId.patientCode}</div>}
              </td>
              <td className="px-4 py-2">{r.patientId?.age ?? '—'} / {r.patientId?.gender ?? '—'}</td>
              <td className="px-4 py-2">{r.doctorId?.name ?? '—'}</td>
              <td className="px-4 py-2 capitalize">{r.visitType ?? '—'}</td>
              <td className="px-4 py-2 capitalize">{r.paymentMode ?? 'Cash'}</td>
              <td className="px-4 py-2 text-right text-green-700">{fmt(r.paidAmount)}</td>
            </tr>
          ))}
        </ReportTable>
      )}

      {/* ══ IPD ══════════════════════════════════════════════════════════════ */}
      {tab === 'ipd' && ipdRows && (
        <ReportTable
          title="IPD Report"
          empty={ipdRows.admissions.length === 0}
          footer={`${ipdRows.admissions.length} admissions · Total Paid: ${fmt(Object.values(ipdRows.paidByIpd).reduce((s, v) => s + v, 0))}`}
          headers={['Admission Date', 'Patient', 'Doctor', 'Status', 'Discharge Date', 'Total Paid']}
        >
          {ipdRows.admissions.map(r => (
            <tr key={r._id} className="hover:bg-gray-50">
              <td className="px-4 py-2">{r.admissionDate}</td>
              <td className="px-4 py-2">
                <div className="font-medium">{r.patientId?.name ?? '—'}</div>
                {r.patientId?.patientCode && <div className="text-gray-400">{r.patientId.patientCode}</div>}
              </td>
              <td className="px-4 py-2">{r.doctorId?.name ?? '—'}</td>
              <td className="px-4 py-2">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${r.status === 'discharged' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                  {r.status ?? 'admitted'}
                </span>
              </td>
              <td className="px-4 py-2">{r.dischargeDate ?? '—'}</td>
              <td className="px-4 py-2 text-right text-green-700">{fmt(ipdRows.paidByIpd[r._id] ?? 0)}</td>
            </tr>
          ))}
        </ReportTable>
      )}

      {/* ══ PHARMACY ══════════════════════════════════════════════════════════ */}
      {tab === 'pharmacy' && (
        <BillTable title="Pharmacy Report" rows={pharRows} fmt={fmt} />
      )}

      {/* ══ PATHOLOGY ═════════════════════════════════════════════════════════ */}
      {tab === 'pathology' && (
        <BillTable title="Pathology Report" rows={pathRows} fmt={fmt} />
      )}

      {/* ══ RADIOLOGY ═════════════════════════════════════════════════════════ */}
      {tab === 'radiology' && (
        <BillTable title="Radiology Report" rows={radRows} fmt={fmt} />
      )}

      {/* ══ COLLECTIONS ═══════════════════════════════════════════════════════ */}
      {tab === 'collections' && (
        <ReportTable
          title="Collections by Staff"
          empty={collections.length === 0}
          footer={`${collections.length} staff · Total: ${fmt(collections.reduce((s, r) => s + r.total, 0))}`}
          headers={['Staff Name', 'OPD', 'IPD', 'Pharmacy', 'Pathology', 'Radiology', 'Total', 'Transactions']}
        >
          {collections.map((r, i) => (
            <tr key={i} className="hover:bg-gray-50">
              <td className="px-4 py-2 font-medium">{r.name}</td>
              <td className="px-4 py-2 text-right">{r.opd      ? fmt(r.opd)      : '—'}</td>
              <td className="px-4 py-2 text-right">{r.ipd      ? fmt(r.ipd)      : '—'}</td>
              <td className="px-4 py-2 text-right">{r.pharmacy  ? fmt(r.pharmacy)  : '—'}</td>
              <td className="px-4 py-2 text-right">{r.pathology ? fmt(r.pathology) : '—'}</td>
              <td className="px-4 py-2 text-right">{r.radiology ? fmt(r.radiology) : '—'}</td>
              <td className="px-4 py-2 text-right font-semibold text-green-700">{fmt(r.total)}</td>
              <td className="px-4 py-2 text-right">{r.count}</td>
            </tr>
          ))}
        </ReportTable>
      )}

      {/* ── Print footer ── */}
      <div className="hidden print:block text-center text-xs text-gray-400 mt-8 pt-4 border-t border-gray-200">
        {tenant?.name} · Report period: {from} — {to} · Printed on {todayString()}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .print-hide { display: none !important; }
        }
      `}} />
    </div>
  )
}

// ── Shared sub-components ──────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color, bold }: {
  label: string; value: string; sub: string; color: string; bold?: boolean
}) {
  const colors: Record<string, string> = {
    blue:   'bg-blue-50   border-blue-100   text-blue-700',
    purple: 'bg-purple-50 border-purple-100 text-purple-700',
    green:  'bg-green-50  border-green-100  text-green-700',
    orange: 'bg-orange-50 border-orange-100 text-orange-700',
    red:    'bg-red-50    border-red-100    text-red-700',
    teal:   'bg-teal-50   border-teal-100   text-teal-700',
  }
  return (
    <div className={`rounded-lg border p-3 ${colors[color] ?? colors.blue}`}>
      <div className="text-[10px] uppercase tracking-wide font-medium opacity-70">{label}</div>
      <div className={`text-sm mt-0.5 ${bold ? 'font-bold' : 'font-semibold'}`}>{value}</div>
      <div className="text-[10px] opacity-60 mt-0.5">{sub}</div>
    </div>
  )
}

function ReportTable({ title, empty, footer, headers, children }: {
  title: string; empty: boolean; footer: string; headers: string[]; children: React.ReactNode
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{title}</h3>
        <span className="text-[10px] text-gray-400">{footer}</span>
      </div>
      {empty ? (
        <div className="px-4 py-8 text-center text-xs text-gray-400">No data for this period</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[600px]">
            <thead>
              <tr className="text-gray-500 border-b border-gray-100">
                {headers.map(h => (
                  <th key={h} className={`px-4 py-2 ${h === 'Amount' || h === 'Total' || h === 'Total Paid' ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">{children}</tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function BillTable({ title, rows, fmt }: { title: string; rows: BillRow[]; fmt: (n: number) => string }) {
  const totalPaid = rows.reduce((s, r) => s + (r.paidAmount ?? 0), 0)
  const totalBal  = rows.reduce((s, r) => s + (r.balance  ?? 0), 0)
  return (
    <ReportTable
      title={title}
      empty={rows.length === 0}
      footer={`${rows.length} bills · Paid: ${fmt(totalPaid)} · Balance: ${fmt(totalBal)}`}
      headers={['Date', 'Bill No', 'Patient', 'Amount', 'Discount', 'Net', 'Paid', 'Balance', 'Mode', 'By']}
    >
      {rows.map(r => (
        <tr key={r._id} className="hover:bg-gray-50">
          <td className="px-4 py-2">{r.billDate}</td>
          <td className="px-4 py-2 font-mono text-[10px]">{r.billNo}</td>
          <td className="px-4 py-2">
            <div className="font-medium">{r.patientId?.name ?? '—'}</div>
            {r.patientId?.patientCode && <div className="text-gray-400">{r.patientId.patientCode}</div>}
          </td>
          <td className="px-4 py-2 text-right">{fmt(r.amount)}</td>
          <td className="px-4 py-2 text-right text-orange-600">{r.discountAmount ? fmt(r.discountAmount) : '—'}</td>
          <td className="px-4 py-2 text-right">{fmt(r.netAmount)}</td>
          <td className="px-4 py-2 text-right text-green-700">{fmt(r.paidAmount)}</td>
          <td className="px-4 py-2 text-right text-red-600">{r.balance > 0 ? fmt(r.balance) : '—'}</td>
          <td className="px-4 py-2 capitalize">{r.paymentMode ?? 'Cash'}</td>
          <td className="px-4 py-2">{r.createdBy?.name ?? '—'}</td>
        </tr>
      ))}
    </ReportTable>
  )
}
