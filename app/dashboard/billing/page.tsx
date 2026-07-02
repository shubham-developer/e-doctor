'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/apiClient'
import { useApp } from '@/lib/context'
import { todayString } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import {
  Calendar, Search, Printer, ChevronLeft, ChevronRight,
  Activity, Pill, FlaskConical, Stethoscope, BedDouble,
  LayoutGrid, RefreshCw, Plus, Wallet,
} from 'lucide-react'
import { printOpdReceipt }           from '@/components/patients/OpdReceiptPrinter'
import { printPharmacyBillReceipt }  from '@/components/pharmacy/PharmacyBillPrinter'
import { printPathologyBillReceipt } from '@/components/pathology/PathologyBillPrinter'
import { printRadiologyBillReceipt } from '@/components/radiology/RadiologyBillPrinter'

// ── Types ──────────────────────────────────────────────────────────────────────

type ModuleTab = 'overview' | 'opd' | 'pharmacy' | 'pathology' | 'radiology' | 'ipd'

interface Summary {
  opd:       { count: number; collected: number }
  pharmacy:  { count: number; net: number; paid: number; balance: number }
  pathology: { count: number; net: number; paid: number; balance: number }
  radiology: { count: number; net: number; paid: number; balance: number }
  ipd:       { admissions: number; collected: number }
}

interface Paginated<T> { bills: T[]; total: number; totalPages: number; page: number }

interface OpdBill {
  _id: string; visitDate: string; opdNumber: number; caseNumber?: string
  paidAmount: number; paymentMode?: string; totalFee: number; discount?: number; tax?: number
  appliedCharge?: number; chiefComplaint?: string; createdAt: string
  charges: { name: string; fee: number }[]
  patientId?: { _id: string; name: string; patientCode?: number; age?: number; ageMonths?: number; ageDays?: number; gender?: string; bloodGroup?: string; address?: string; allergies?: string; previousMedicalIssue?: string; phone?: string }
  doctorId?:  { _id: string; name: string; specialization?: string; designation?: string }
}

interface PharBill {
  _id: string; billNumber: number; createdAt: string
  netAmount: number; paidAmount: number; paymentMode: string
  totalAmount: number; discountAmount: number; taxAmount: number
  caseId?: string; prescriptionNo?: string; doctorName?: string; note?: string
  lines: { medicineName: string; batchNo?: string; expiryDate?: string; quantity: number; salePrice: number; taxPercent: number; discountPercent: number; amount: number }[]
  patientId?: { name: string; patientCode?: number; phone?: string }
  doctorId?:  { name: string }
  createdBy?: { name: string }
}

interface PathBill {
  _id: string; billNo: string; billDate: string; caseId?: string
  referenceDoctor?: string; note?: string; previousReportValue?: string
  amount: number; netAmount?: number; paidAmount: number; balance: number; paymentMode?: string
  items: { testName: string; reportDate?: string; charge: number; tax: number; amount: number }[]
  patientId?: { name: string; patientCode?: number; phone?: string }
  createdBy?: { name: string }
}

interface RadBill extends PathBill { billNo: string }

interface IpdBill {
  _id: string; admissionDate: string; dischargeDate?: string; status?: string
  ipdNumber?: number; caseNumber?: string; bedNumber?: string; bedGroup?: string
  totalCharges: number; totalPaid: number; balance: number
  patientId?: { name: string; patientCode?: number; age?: number; gender?: string; phone?: string }
  doctorId?:  { name: string; specialization?: string }
}

interface PaymentModal {
  billId: string; balance: number
  module: 'pharmacy' | 'pathology' | 'radiology'
  patientName: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getPresetRange(p: string): { from: string; to: string } {
  const today = todayString()
  const d = (n: number) => { const dt = new Date(today); dt.setDate(dt.getDate() + n); return dt.toISOString().slice(0, 10) }
  switch (p) {
    case 'today':     return { from: today,   to: today }
    case 'yesterday': return { from: d(-1),   to: d(-1) }
    case '7d':        return { from: d(-6),   to: today }
    case '30d':       return { from: d(-29),  to: today }
    case 'month':     return { from: today.slice(0, 8) + '01', to: today }
    default:          return { from: today,   to: today }
  }
}

function statusBadge(paid: number, balance: number) {
  if (balance <= 0) return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-700">PAID</span>
  if (paid > 0)     return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-100 text-orange-700">PARTIAL</span>
  return               <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700">DUE</span>
}

const PRESETS = ['today', 'yesterday', '7d', '30d', 'month', 'custom']
const PRESET_LABELS: Record<string, string> = { today: 'Today', yesterday: 'Yesterday', '7d': 'Last 7 Days', '30d': 'Last 30 Days', month: 'This Month', custom: 'Custom' }

const MODULE_TABS: { key: ModuleTab; label: string; icon: React.ElementType }[] = [
  { key: 'overview',  label: 'Overview',  icon: LayoutGrid  },
  { key: 'opd',       label: 'OPD',       icon: Activity    },
  { key: 'pharmacy',  label: 'Pharmacy',  icon: Pill        },
  { key: 'pathology', label: 'Pathology', icon: FlaskConical},
  { key: 'radiology', label: 'Radiology', icon: Stethoscope },
  { key: 'ipd',       label: 'IPD',       icon: BedDouble   },
]

const PAYMENT_MODES = ['Cash', 'UPI', 'Card', 'Cheque', 'Online', 'Insurance']

// ── Main Component ─────────────────────────────────────────────────────────────

export default function BillingPage() {
  const router = useRouter()
  const { tenant } = useApp()
  const sym = tenant?.currencySymbol ?? '₹'
  const fmt = (n: number) => `${sym}${(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const [tab,      setTab]      = useState<ModuleTab>('overview')
  const [preset,   setPreset]   = useState('today')
  const [from,     setFrom]     = useState(todayString())
  const [to,       setTo]       = useState(todayString())
  const [rawSearch,setRawSearch]= useState('')
  const [search,   setSearch]   = useState('')
  const [status,   setStatus]   = useState('all')
  const [page,     setPage]     = useState(1)
  const [loading,  setLoading]  = useState(false)

  const [summary,  setSummary]  = useState<Summary | null>(null)
  const [opdData,  setOpdData]  = useState<Paginated<OpdBill>  | null>(null)
  const [pharData, setPharData] = useState<Paginated<PharBill> | null>(null)
  const [pathData, setPathData] = useState<Paginated<PathBill> | null>(null)
  const [radData,  setRadData]  = useState<Paginated<RadBill>  | null>(null)
  const [ipdData,  setIpdData]  = useState<Paginated<IpdBill>  | null>(null)

  const [payModal, setPayModal] = useState<PaymentModal | null>(null)
  const [payAmt,   setPayAmt]   = useState('')
  const [payMode,  setPayMode]  = useState('Cash')
  const [paying,   setPaying]   = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const applyPreset = (p: string) => {
    setPreset(p)
    if (p !== 'custom') { const r = getPresetRange(p); setFrom(r.from); setTo(r.to) }
  }

  const handleSearchChange = (v: string) => {
    setRawSearch(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { setSearch(v); setPage(1) }, 300)
  }

  const load = useCallback(async (module: ModuleTab, f: string, t: string, s: string, st: string, pg: number) => {
    setLoading(true)
    if (module === 'overview') {
      const d = await apiClient.get<Summary>(`/api/dashboard/billing?module=summary&from=${f}&to=${t}`)
      if (d.success) setSummary(d.data)
    } else {
      const url = `/api/dashboard/billing?module=${module}&from=${f}&to=${t}&search=${encodeURIComponent(s)}&status=${st}&page=${pg}&limit=50`
      const d = await apiClient.get<unknown>(url)
      if (d.success) {
        if (module === 'opd')       setOpdData(d.data  as Paginated<OpdBill>)
        if (module === 'pharmacy')  setPharData(d.data as Paginated<PharBill>)
        if (module === 'pathology') setPathData(d.data as Paginated<PathBill>)
        if (module === 'radiology') setRadData(d.data  as Paginated<RadBill>)
        if (module === 'ipd')       setIpdData(d.data  as Paginated<IpdBill>)
      }
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load(tab, from, to, search, status, page)
  }, [tab, from, to, search, status, page, load])

  // Reset page when filters change (but not on page change itself)
  const prevFiltersRef = useRef({ tab, from, to, search, status })
  useEffect(() => {
    const prev = prevFiltersRef.current
    if (prev.tab !== tab || prev.from !== from || prev.to !== to || prev.search !== search || prev.status !== status) {
      setPage(1)
      prevFiltersRef.current = { tab, from, to, search, status }
    }
  }, [tab, from, to, search, status])

  // ── Print handlers ──────────────────────────────────────────────────────────

  const printOpd = (b: OpdBill) => {
    const p = b.patientId
    printOpdReceipt({
      opdNumber: b.opdNumber, caseNumber: b.caseNumber,
      visitDate: b.visitDate, visitTime: new Date(b.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      patientName: p?.name ?? '—', patientCode: p?.patientCode,
      patientAge: p?.age ?? 0, patientAgeMonths: p?.ageMonths, patientAgeDays: p?.ageDays,
      patientGender: p?.gender, patientBloodGroup: p?.bloodGroup,
      patientAddress: p?.address, patientAllergies: p?.allergies,
      previousMedicalIssue: p?.previousMedicalIssue,
      doctorName: b.doctorId?.name, doctorSpecialization: b.doctorId?.designation ?? b.doctorId?.specialization,
      chiefComplaint: b.chiefComplaint ?? '',
      charges: b.charges ?? [], totalFee: b.totalFee,
      appliedCharge: b.appliedCharge, discount: b.discount, tax: b.tax,
      clinicName: tenant?.name ?? '', clinicAddress: tenant?.address,
      logoUrl: tenant?.logoUrl,
    })
  }

  const printPhar = (b: PharBill) => {
    const p = b.patientId
    const dateStr = new Date(b.createdAt).toISOString().slice(0, 10)
    printPharmacyBillReceipt({
      billNumber: b.billNumber, billDate: dateStr,
      currency: tenant?.currency, currencySymbol: sym,
      caseId: b.caseId, prescriptionNo: b.prescriptionNo,
      patientName: p?.name, patientCode: p?.patientCode != null ? String(p.patientCode) : undefined,
      doctorName: b.doctorId?.name ?? b.doctorName,
      lines: b.lines ?? [],
      totalAmount: b.totalAmount, discountAmount: b.discountAmount,
      taxAmount: b.taxAmount, netAmount: b.netAmount,
      paidAmount: b.paidAmount, paymentMode: b.paymentMode ?? 'Cash',
      clinicName: tenant?.name ?? '', clinicAddress: tenant?.address,
      logoUrl: tenant?.logoUrl,
    })
  }

  const printPath = (b: PathBill) => {
    const p = b.patientId
    printPathologyBillReceipt({
      billNo: b.billNo, billDate: b.billDate, caseId: b.caseId,
      patientName: p?.name, patientCode: p?.patientCode != null ? String(p.patientCode) : undefined,
      referenceDoctor: b.referenceDoctor, note: b.note, previousReportValue: b.previousReportValue,
      items: b.items ?? [],
      totalAmount: b.amount, discountAmount: 0, taxAmount: 0,
      netAmount: b.netAmount ?? b.amount,
      paidAmount: b.paidAmount, balance: b.balance, paymentMode: b.paymentMode,
      clinicName: tenant?.name ?? '', clinicAddress: tenant?.address,
      logoUrl: tenant?.logoUrl, currencySymbol: sym,
    })
  }

  const printRad = (b: RadBill) => {
    const p = b.patientId
    printRadiologyBillReceipt({
      billNo: b.billNo, billDate: b.billDate, caseId: b.caseId,
      patientName: p?.name, patientCode: p?.patientCode != null ? String(p.patientCode) : undefined,
      referenceDoctor: b.referenceDoctor, note: b.note, previousReportValue: b.previousReportValue,
      items: b.items ?? [],
      totalAmount: b.amount, discountAmount: 0, taxAmount: 0,
      netAmount: b.netAmount ?? b.amount,
      paidAmount: b.paidAmount, balance: b.balance, paymentMode: b.paymentMode,
      clinicName: tenant?.name ?? '', clinicAddress: tenant?.address,
      logoUrl: tenant?.logoUrl, currencySymbol: sym,
    })
  }

  // ── Add Payment ─────────────────────────────────────────────────────────────

  const openPayModal = (mod: PaymentModal['module'], billId: string, balance: number, patientName: string) => {
    setPayModal({ module: mod, billId, balance, patientName })
    setPayAmt('')
    setPayMode('Cash')
  }

  const submitPayment = async () => {
    if (!payModal) return
    const amt = Number(payAmt)
    if (!amt || amt <= 0) { toast.error('Enter a valid amount'); return }
    if (amt > payModal.balance) { toast.error('Amount exceeds balance'); return }
    setPaying(true)

    let url = ''
    let method: 'post' | 'patch' = 'patch'
    if (payModal.module === 'pharmacy')  { url = `/api/dashboard/pharmacy/bills/${payModal.billId}/payments`; method = 'post' }
    if (payModal.module === 'pathology') url = `/api/dashboard/pathology/bills/${payModal.billId}`
    if (payModal.module === 'radiology') url = `/api/dashboard/radiology/bills/${payModal.billId}`

    const d = await apiClient[method]<unknown>(url, { amount: amt, paymentMode: payMode, mode: payMode })
    setPaying(false)
    if (!d.success) { toast.error('Payment failed'); return }
    toast.success('Payment recorded')
    setPayModal(null)
    load(tab, from, to, search, status, page)
  }

  // ── Pagination ──────────────────────────────────────────────────────────────

  const currentPagination = () => {
    if (tab === 'opd')       return opdData
    if (tab === 'pharmacy')  return pharData
    if (tab === 'pathology') return pathData
    if (tab === 'radiology') return radData
    if (tab === 'ipd')       return ipdData
    return null
  }
  const pg = currentPagination()

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 space-y-3 min-h-screen bg-gray-50">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-blue-600" />
          <h1 className="text-lg font-bold text-gray-900">Billing</h1>
          {loading && <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin" />}
        </div>
        <p className="text-xs text-gray-400">{from === to ? from : `${from} — ${to}`}</p>
      </div>

      {/* Date presets + search + status */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          {PRESETS.map(p => (
            <button key={p} onClick={() => applyPreset(p)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${preset === p ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {PRESET_LABELS[p]}
            </button>
          ))}
          {preset === 'custom' && (
            <div className="flex items-center gap-2 ml-1">
              <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="h-7 text-xs w-36" />
              <span className="text-gray-400 text-xs">to</span>
              <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="h-7 text-xs w-36" />
            </div>
          )}
        </div>
        {tab !== 'overview' && tab !== 'ipd' && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input placeholder="Search patient…" value={rawSearch} onChange={e => handleSearchChange(e.target.value)}
                className="h-7 text-xs pl-8" />
            </div>
            {(tab === 'pharmacy' || tab === 'pathology' || tab === 'radiology') && (
              <div className="flex gap-1">
                {['all', 'paid', 'partial', 'due'].map(s => (
                  <button key={s} onClick={() => setStatus(s)}
                    className={`px-2.5 py-1 rounded text-xs font-medium capitalize transition-colors ${status === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Module tabs */}
      <div className="flex flex-wrap gap-1">
        {MODULE_TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === key ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
            <Icon className="w-3 h-3" />
            {label}
          </button>
        ))}
      </div>

      {/* ══ OVERVIEW ═══════════════════════════════════════════════════════════ */}
      {tab === 'overview' && summary && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <ModuleCard label="OPD"       icon={Activity}     count={summary.opd.count}       collected={summary.opd.collected}     fmt={fmt} color="blue" />
            <ModuleCard label="Pharmacy"  icon={Pill}         count={summary.pharmacy.count}  collected={summary.pharmacy.paid}     fmt={fmt} color="green"  balance={summary.pharmacy.balance} />
            <ModuleCard label="Pathology" icon={FlaskConical} count={summary.pathology.count} collected={summary.pathology.paid}    fmt={fmt} color="orange" balance={summary.pathology.balance} />
            <ModuleCard label="Radiology" icon={Stethoscope}  count={summary.radiology.count} collected={summary.radiology.paid}    fmt={fmt} color="red"    balance={summary.radiology.balance} />
            <ModuleCard label="IPD"       icon={BedDouble}    count={summary.ipd.admissions}  collected={summary.ipd.collected}     fmt={fmt} color="purple" />
          </div>

          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Billing Summary</h3>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500 border-b border-gray-100">
                  <th className="text-left px-4 py-2">Module</th>
                  <th className="text-right px-4 py-2">Bills / Visits</th>
                  <th className="text-right px-4 py-2">Net Amount</th>
                  <th className="text-right px-4 py-2">Collected</th>
                  <th className="text-right px-4 py-2">Balance Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[
                  { label: 'OPD',       count: summary.opd.count,       net: summary.opd.collected,     paid: summary.opd.collected,    bal: 0,                         color: 'text-blue-700'   },
                  { label: 'Pharmacy',  count: summary.pharmacy.count,  net: summary.pharmacy.net,      paid: summary.pharmacy.paid,    bal: summary.pharmacy.balance,  color: 'text-green-700'  },
                  { label: 'Pathology', count: summary.pathology.count, net: summary.pathology.net,     paid: summary.pathology.paid,   bal: summary.pathology.balance, color: 'text-orange-700' },
                  { label: 'Radiology', count: summary.radiology.count, net: summary.radiology.net,     paid: summary.radiology.paid,   bal: summary.radiology.balance, color: 'text-red-700'    },
                  { label: 'IPD',       count: summary.ipd.admissions,  net: summary.ipd.collected,     paid: summary.ipd.collected,    bal: 0,                         color: 'text-purple-700' },
                ].map(r => (
                  <tr key={r.label} className="hover:bg-gray-50">
                    <td className={`px-4 py-2 font-medium ${r.color}`}>{r.label}</td>
                    <td className="text-right px-4 py-2">{r.count}</td>
                    <td className="text-right px-4 py-2">{fmt(r.net)}</td>
                    <td className="text-right px-4 py-2 text-green-700">{fmt(r.paid)}</td>
                    <td className="text-right px-4 py-2 text-red-600">{r.bal > 0 ? fmt(r.bal) : '—'}</td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-semibold border-t border-gray-200">
                  <td className="px-4 py-2 text-gray-800">TOTAL</td>
                  <td className="text-right px-4 py-2">{summary.opd.count + summary.pharmacy.count + summary.pathology.count + summary.radiology.count + summary.ipd.admissions}</td>
                  <td className="text-right px-4 py-2">—</td>
                  <td className="text-right px-4 py-2 text-green-800">
                    {fmt(summary.opd.collected + summary.pharmacy.paid + summary.pathology.paid + summary.radiology.paid + summary.ipd.collected)}
                  </td>
                  <td className="text-right px-4 py-2 text-red-700">
                    {fmt(summary.pharmacy.balance + summary.pathology.balance + summary.radiology.balance)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══ OPD ════════════════════════════════════════════════════════════════ */}
      {tab === 'opd' && (
        <BillCard title="OPD Billing" count={opdData?.total} loading={loading}>
          <table className="w-full text-xs min-w-[700px]">
            <thead>
              <tr className="text-gray-500 border-b border-gray-100 bg-gray-50">
                <th className="text-left px-3 py-2">Date</th>
                <th className="text-left px-3 py-2">OPD No</th>
                <th className="text-left px-3 py-2">Patient</th>
                <th className="text-left px-3 py-2">Doctor</th>
                <th className="text-left px-3 py-2">Mode</th>
                <th className="text-right px-3 py-2">Amount</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(opdData?.bills ?? []).map(b => (
                <tr key={b._id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 whitespace-nowrap">{b.visitDate}</td>
                  <td className="px-3 py-2 font-mono text-[10px]">OPDN{String(b.opdNumber).padStart(4, '0')}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{b.patientId?.name ?? '—'}</div>
                    {b.patientId?.patientCode && <div className="text-gray-400">{b.patientId.patientCode}</div>}
                  </td>
                  <td className="px-3 py-2">{b.doctorId?.name ?? '—'}</td>
                  <td className="px-3 py-2 capitalize">{b.paymentMode ?? 'Cash'}</td>
                  <td className="px-3 py-2 text-right font-medium text-green-700">{fmt(b.paidAmount)}</td>
                  <td className="px-3 py-2">
                    <Button size="sm" variant="ghost" onClick={() => printOpd(b)} className="h-6 px-2 text-[10px]">
                      <Printer className="w-3 h-3 mr-1" />Print
                    </Button>
                  </td>
                </tr>
              ))}
              {(opdData?.bills ?? []).length === 0 && !loading && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-xs">No OPD bills for this period</td></tr>
              )}
            </tbody>
          </table>
        </BillCard>
      )}

      {/* ══ PHARMACY ════════════════════════════════════════════════════════════ */}
      {tab === 'pharmacy' && (
        <BillCard title="Pharmacy Billing" count={pharData?.total} loading={loading}>
          <table className="w-full text-xs min-w-[820px]">
            <thead>
              <tr className="text-gray-500 border-b border-gray-100 bg-gray-50">
                <th className="text-left px-3 py-2">Date</th>
                <th className="text-left px-3 py-2">Bill No</th>
                <th className="text-left px-3 py-2">Patient</th>
                <th className="text-right px-3 py-2">Net</th>
                <th className="text-right px-3 py-2">Paid</th>
                <th className="text-right px-3 py-2">Balance</th>
                <th className="text-left px-3 py-2">Mode</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">By</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(pharData?.bills ?? []).map(b => {
                const balance = b.netAmount - b.paidAmount
                return (
                  <tr key={b._id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap">{new Date(b.createdAt).toISOString().slice(0, 10)}</td>
                    <td className="px-3 py-2 font-mono text-[10px]">PHARMAB{b.billNumber}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{b.patientId?.name ?? '—'}</div>
                      {b.patientId?.patientCode != null && <div className="text-gray-400">{b.patientId.patientCode}</div>}
                    </td>
                    <td className="px-3 py-2 text-right">{fmt(b.netAmount)}</td>
                    <td className="px-3 py-2 text-right text-green-700">{fmt(b.paidAmount)}</td>
                    <td className="px-3 py-2 text-right text-red-600">{balance > 0 ? fmt(balance) : '—'}</td>
                    <td className="px-3 py-2 capitalize">{b.paymentMode}</td>
                    <td className="px-3 py-2">{statusBadge(b.paidAmount, balance)}</td>
                    <td className="px-3 py-2">{b.createdBy?.name ?? '—'}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => printPhar(b)} className="h-6 px-2 text-[10px]">
                          <Printer className="w-3 h-3 mr-1" />Print
                        </Button>
                        {balance > 0 && (
                          <Button size="sm" variant="ghost" onClick={() => openPayModal('pharmacy', b._id, balance, b.patientId?.name ?? '')} className="h-6 px-2 text-[10px] text-blue-600">
                            <Plus className="w-3 h-3 mr-1" />Pay
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {(pharData?.bills ?? []).length === 0 && !loading && (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400 text-xs">No pharmacy bills for this period</td></tr>
              )}
            </tbody>
          </table>
        </BillCard>
      )}

      {/* ══ PATHOLOGY ═══════════════════════════════════════════════════════════ */}
      {tab === 'pathology' && (
        <BillCard title="Pathology Billing" count={pathData?.total} loading={loading}>
          <table className="w-full text-xs min-w-[820px]">
            <thead>
              <tr className="text-gray-500 border-b border-gray-100 bg-gray-50">
                <th className="text-left px-3 py-2">Date</th>
                <th className="text-left px-3 py-2">Bill No</th>
                <th className="text-left px-3 py-2">Patient</th>
                <th className="text-left px-3 py-2">Tests</th>
                <th className="text-right px-3 py-2">Amount</th>
                <th className="text-right px-3 py-2">Paid</th>
                <th className="text-right px-3 py-2">Balance</th>
                <th className="text-left px-3 py-2">Mode</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(pathData?.bills ?? []).map(b => (
                <tr key={b._id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 whitespace-nowrap">{b.billDate}</td>
                  <td className="px-3 py-2 font-mono text-[10px]">{b.billNo}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{b.patientId?.name ?? '—'}</div>
                    {b.patientId?.patientCode != null && <div className="text-gray-400">{b.patientId.patientCode}</div>}
                  </td>
                  <td className="px-3 py-2 text-gray-500">{b.items?.length ?? 0} test{(b.items?.length ?? 0) !== 1 ? 's' : ''}</td>
                  <td className="px-3 py-2 text-right">{fmt(b.amount)}</td>
                  <td className="px-3 py-2 text-right text-green-700">{fmt(b.paidAmount)}</td>
                  <td className="px-3 py-2 text-right text-red-600">{b.balance > 0 ? fmt(b.balance) : '—'}</td>
                  <td className="px-3 py-2 capitalize">{b.paymentMode ?? 'Cash'}</td>
                  <td className="px-3 py-2">{statusBadge(b.paidAmount, b.balance)}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => printPath(b)} className="h-6 px-2 text-[10px]">
                        <Printer className="w-3 h-3 mr-1" />Print
                      </Button>
                      {b.balance > 0 && (
                        <Button size="sm" variant="ghost" onClick={() => openPayModal('pathology', b._id, b.balance, b.patientId?.name ?? '')} className="h-6 px-2 text-[10px] text-blue-600">
                          <Plus className="w-3 h-3 mr-1" />Pay
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {(pathData?.bills ?? []).length === 0 && !loading && (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400 text-xs">No pathology bills for this period</td></tr>
              )}
            </tbody>
          </table>
        </BillCard>
      )}

      {/* ══ RADIOLOGY ═══════════════════════════════════════════════════════════ */}
      {tab === 'radiology' && (
        <BillCard title="Radiology Billing" count={radData?.total} loading={loading}>
          <table className="w-full text-xs min-w-[820px]">
            <thead>
              <tr className="text-gray-500 border-b border-gray-100 bg-gray-50">
                <th className="text-left px-3 py-2">Date</th>
                <th className="text-left px-3 py-2">Bill No</th>
                <th className="text-left px-3 py-2">Patient</th>
                <th className="text-left px-3 py-2">Tests</th>
                <th className="text-right px-3 py-2">Amount</th>
                <th className="text-right px-3 py-2">Paid</th>
                <th className="text-right px-3 py-2">Balance</th>
                <th className="text-left px-3 py-2">Mode</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(radData?.bills ?? []).map(b => (
                <tr key={b._id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 whitespace-nowrap">{b.billDate}</td>
                  <td className="px-3 py-2 font-mono text-[10px]">{b.billNo}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{b.patientId?.name ?? '—'}</div>
                    {b.patientId?.patientCode != null && <div className="text-gray-400">{b.patientId.patientCode}</div>}
                  </td>
                  <td className="px-3 py-2 text-gray-500">{b.items?.length ?? 0} test{(b.items?.length ?? 0) !== 1 ? 's' : ''}</td>
                  <td className="px-3 py-2 text-right">{fmt(b.amount)}</td>
                  <td className="px-3 py-2 text-right text-green-700">{fmt(b.paidAmount)}</td>
                  <td className="px-3 py-2 text-right text-red-600">{b.balance > 0 ? fmt(b.balance) : '—'}</td>
                  <td className="px-3 py-2 capitalize">{b.paymentMode ?? 'Cash'}</td>
                  <td className="px-3 py-2">{statusBadge(b.paidAmount, b.balance)}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => printRad(b)} className="h-6 px-2 text-[10px]">
                        <Printer className="w-3 h-3 mr-1" />Print
                      </Button>
                      {b.balance > 0 && (
                        <Button size="sm" variant="ghost" onClick={() => openPayModal('radiology', b._id, b.balance, b.patientId?.name ?? '')} className="h-6 px-2 text-[10px] text-blue-600">
                          <Plus className="w-3 h-3 mr-1" />Pay
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {(radData?.bills ?? []).length === 0 && !loading && (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400 text-xs">No radiology bills for this period</td></tr>
              )}
            </tbody>
          </table>
        </BillCard>
      )}

      {/* ══ IPD ════════════════════════════════════════════════════════════════ */}
      {tab === 'ipd' && (
        <BillCard title="IPD Billing" count={ipdData?.total} loading={loading}>
          <table className="w-full text-xs min-w-[820px]">
            <thead>
              <tr className="text-gray-500 border-b border-gray-100 bg-gray-50">
                <th className="text-left px-3 py-2">Admission</th>
                <th className="text-left px-3 py-2">Patient</th>
                <th className="text-left px-3 py-2">Doctor</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-right px-3 py-2">Total Charges</th>
                <th className="text-right px-3 py-2">Paid</th>
                <th className="text-right px-3 py-2">Balance</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(ipdData?.bills ?? []).map(b => (
                <tr key={b._id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div>{b.admissionDate}</div>
                    {b.dischargeDate && <div className="text-gray-400">→ {b.dischargeDate}</div>}
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{b.patientId?.name ?? '—'}</div>
                    {b.patientId?.patientCode != null && <div className="text-gray-400">{b.patientId.patientCode}</div>}
                  </td>
                  <td className="px-3 py-2">{b.doctorId?.name ?? '—'}</td>
                  <td className="px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${b.status === 'discharged' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                      {b.status ?? 'admitted'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">{fmt(b.totalCharges)}</td>
                  <td className="px-3 py-2 text-right text-green-700">{fmt(b.totalPaid)}</td>
                  <td className="px-3 py-2 text-right">
                    {b.balance > 0
                      ? <span className="text-red-600 font-medium">{fmt(b.balance)}</span>
                      : <span className="text-green-600">Paid</span>}
                  </td>
                  <td className="px-3 py-2">
                    <Button size="sm" variant="ghost" onClick={() => router.push(`/dashboard/ipd/${b._id}`)} className="h-6 px-2 text-[10px]">
                      View
                    </Button>
                  </td>
                </tr>
              ))}
              {(ipdData?.bills ?? []).length === 0 && !loading && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400 text-xs">No IPD admissions for this period</td></tr>
              )}
            </tbody>
          </table>
        </BillCard>
      )}

      {/* Pagination */}
      {tab !== 'overview' && pg && pg.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-2.5">
          <span className="text-xs text-gray-500">
            Showing {((page - 1) * 50) + 1}–{Math.min(page * 50, pg.total)} of {pg.total}
          </span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="h-7 w-7 p-0">
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <span className="text-xs font-medium">{page} / {pg.totalPages}</span>
            <Button size="sm" variant="outline" disabled={page >= pg.totalPages} onClick={() => setPage(p => p + 1)} className="h-7 w-7 p-0">
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Add Payment Modal ──────────────────────────────────────────────── */}
      {payModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setPayModal(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-sm font-bold text-gray-900 mb-1">Add Payment</h2>
            <p className="text-xs text-gray-500 mb-4">
              {payModal.patientName} · Balance: <span className="font-semibold text-red-600">{fmt(payModal.balance)}</span>
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Amount</label>
                <Input
                  type="number" min="0" step="0.01" max={payModal.balance}
                  value={payAmt} onChange={e => setPayAmt(e.target.value)}
                  placeholder={`Max ${fmt(payModal.balance)}`}
                  className="h-8 text-sm"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Payment Mode</label>
                <div className="flex flex-wrap gap-1.5">
                  {PAYMENT_MODES.map(m => (
                    <button key={m} onClick={() => setPayMode(m)}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${payMode === m ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <Button size="sm" variant="outline" onClick={() => setPayModal(null)}>Cancel</Button>
              <Button size="sm" onClick={submitPayment} disabled={paying} className="bg-blue-600 hover:bg-blue-700 text-white">
                {paying ? 'Saving…' : 'Record Payment'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ModuleCard({ label, icon: Icon, count, collected, balance, fmt, color }: {
  label: string; icon: React.ElementType; count: number; collected: number; balance?: number; fmt: (n: number) => string; color: string
}) {
  const bg: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-100', green: 'bg-green-50 border-green-100',
    orange: 'bg-orange-50 border-orange-100', red: 'bg-red-50 border-red-100',
    purple: 'bg-purple-50 border-purple-100',
  }
  const txt: Record<string, string> = {
    blue: 'text-blue-700', green: 'text-green-700',
    orange: 'text-orange-700', red: 'text-red-700', purple: 'text-purple-700',
  }
  return (
    <div className={`rounded-lg border p-3 ${bg[color]}`}>
      <div className={`flex items-center gap-1.5 text-[10px] uppercase tracking-wide font-medium ${txt[color]}`}>
        <Icon className="w-3 h-3" />{label}
      </div>
      <div className={`text-sm font-bold mt-1 ${txt[color]}`}>{count} bills</div>
      <div className="text-[10px] text-gray-600 mt-0.5">Collected: {fmt(collected)}</div>
      {balance != null && balance > 0 && (
        <div className="text-[10px] text-red-600 mt-0.5">Due: {fmt(balance)}</div>
      )}
    </div>
  )
}

function BillCard({ title, count, loading, children }: {
  title: string; count?: number; loading: boolean; children: React.ReactNode
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{title}</h3>
        {count != null && <span className="text-[10px] text-gray-400">{count} records</span>}
      </div>
      {loading ? (
        <div className="px-4 py-8 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="overflow-x-auto">{children}</div>
      )}
    </div>
  )
}
