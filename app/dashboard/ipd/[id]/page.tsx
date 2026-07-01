'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, BedDouble, User, Phone, MapPin, Droplet, Calendar, FileText, Stethoscope } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/format'

// ── Types ─────────────────────────────────────────────────────────────────────

interface PatientInfo {
  _id: string
  name: string
  age: number
  ageMonths?: number
  ageDays?: number
  patientCode?: number
  gender?: string
  phone?: string
  email?: string
  guardianName?: string
  address?: string
  bloodGroup?: string
  allergies?: string
  remarks?: string
  tpa?: string
  tpaId?: string
  tpaValidity?: string
  nationalId?: string
}

interface IpdDetail {
  _id: string
  ipdNumber: number
  admissionDate: string
  dischargeDate?: string
  status: 'ADMITTED' | 'DISCHARGED'
  bedGroup?: string
  bedNumber?: string
  symptomsType?: string
  symptomsTitle?: string
  chiefComplaint?: string
  note?: string
  previousMedicalIssue?: string
  isAntenatal?: boolean
  tpa?: string
  creditLimit?: number
  casualty?: boolean
  isOldPatient?: boolean
  liveConsultation?: boolean
  caseNumber?: string
  reference?: string
  patientId: PatientInfo | null
  doctorId: { name: string; specialization: string; staffCode?: number } | null
  createdBy?: { userId: string; name: string }
  createdAt: string
}

// ── Tab list ──────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'overview',            label: 'Overview' },
  { key: 'nurse-notes',         label: 'Nurse Notes' },
  { key: 'medication',          label: 'Medication' },
  { key: 'prescription',        label: 'Prescription' },
  { key: 'consultant-register', label: 'Consultant Register' },
  { key: 'lab-investigation',   label: 'Lab Investigation' },
  { key: 'operations',          label: 'Operations' },
  { key: 'charges',             label: 'Charges' },
  { key: 'payments',            label: 'Payments' },
  { key: 'live-consultation',   label: 'Live Consultation' },
]

// ── Billing card ──────────────────────────────────────────────────────────────

function BillingCard({ title, pct, used, total }: { title: string; pct: number; used: string; total: string }) {
  return (
    <div className="border border-gray-200 rounded-lg p-3">
      <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">{title}</p>
      <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
        <span>{pct.toFixed(2)}%</span>
        <span className="font-mono">{used}/{total}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  )
}

// ── Donut chart ───────────────────────────────────────────────────────────────

function DonutChart({ pct }: { pct: number }) {
  const r = 54
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#e5e7eb" strokeWidth="16" />
        <circle
          cx="70" cy="70" r={r} fill="none"
          stroke="#22c55e" strokeWidth="16"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          transform="rotate(-90 70 70)"
        />
        <text x="70" y="75" textAnchor="middle" className="text-sm font-semibold" fontSize="14" fill="#374151">
          {pct.toFixed(2)}%
        </text>
      </svg>
      <div className="text-center text-xs text-gray-500 space-y-0.5">
        <p>Credit Limit: <span className="font-semibold text-gray-800">${(0).toLocaleString()}.00</span></p>
        <p className="text-red-500">Used Credit Limit: <span className="font-semibold">${(0).toFixed(2)}</span></p>
        <p className="text-green-600">Balance Credit Limit: <span className="font-semibold">${(0).toLocaleString()}.00</span></p>
      </div>
    </div>
  )
}

// ── Info row ──────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex py-1.5 border-b border-gray-100 last:border-0">
      <span className="w-36 shrink-0 text-xs font-semibold text-gray-700">{label}</span>
      <span className="text-xs text-gray-600">{value || '—'}</span>
    </div>
  )
}

// ── Placeholder tab ───────────────────────────────────────────────────────────

function PlaceholderTab({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-2">
      <FileText className="w-12 h-12 text-gray-200" />
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs">Coming soon</p>
    </div>
  )
}

// ── Overview tab ──────────────────────────────────────────────────────────────

function OverviewTab({ admission }: { admission: IpdDetail }) {
  const p = admission.patientId

  const ageStr = p ? [
    p.age       ? `${p.age} Year`       : null,
    p.ageMonths ? `${p.ageMonths} Month` : null,
    p.ageDays   ? `${p.ageDays} Day`    : null,
  ].filter(Boolean).join(', ') : '—'

  const bedDisplay = [admission.bedNumber, admission.bedGroup].filter(Boolean).join(' - ') || '—'

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Top section: patient card + billing */}
      <div className="flex gap-4">
        {/* Patient card */}
        <div className="w-80 shrink-0 border border-gray-200 rounded-lg p-4 bg-white">
          {/* Photo + name */}
          <div className="flex gap-3 mb-4 pb-4 border-b border-gray-100">
            <div className="w-20 h-20 shrink-0 bg-gray-200 rounded-lg flex flex-col items-center justify-center text-[10px] text-gray-500 text-center border border-gray-300">
              <User className="w-8 h-8 text-gray-400 mb-1" />
              <span>NO IMAGE</span>
              <span>AVAILABLE</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 leading-tight">{p?.name ?? '—'}</p>
              {p?.patientCode && (
                <p className="text-xs text-gray-500 mt-0.5">Code: {p.patientCode}</p>
              )}
              {admission.status === 'ADMITTED' ? (
                <Badge className="mt-1.5 bg-green-100 text-green-700 border-0 text-[10px]">Admitted</Badge>
              ) : (
                <Badge className="mt-1.5 bg-orange-100 text-orange-700 border-0 text-[10px]">Discharged</Badge>
              )}
            </div>
          </div>
          {/* Details */}
          <div className="space-y-0">
            <InfoRow label="Gender"       value={p?.gender} />
            <InfoRow label="Age"          value={ageStr} />
            <InfoRow label="Guardian Name" value={p?.guardianName} />
            <InfoRow label="Phone"        value={p?.phone} />
            <InfoRow label="TPA"          value={p?.tpa} />
            <InfoRow label="TPA ID"       value={p?.tpaId} />
            <InfoRow label="TPA Validity" value={p?.tpaValidity} />
          </div>
          {p?.nationalId && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-1">National ID</p>
              <p className="text-xs font-mono text-gray-700">{p.nationalId}</p>
            </div>
          )}
        </div>

        {/* Right: billing + donut */}
        <div className="flex-1 min-w-0 flex flex-col gap-3">
          {/* Billing grid */}
          <div className="grid grid-cols-2 gap-3">
            <BillingCard title="IPD Payment/Billing"         pct={0}   used="$0.00" total="$0" />
            <BillingCard title="Pharmacy Payment/Billing"    pct={0}   used="$0"    total="$0" />
            <BillingCard title="Pathology Payment/Billing"   pct={0}   used="$0"    total="$0" />
            <BillingCard title="Radiology Payment/Billing"   pct={0}   used="$0"    total="$0" />
            <BillingCard title="Blood Bank Payment/Billing"  pct={0}   used="$0"    total="$0" />
            <BillingCard title="Ambulance Payment/Billing"   pct={0}   used="$0"    total="$0" />
          </div>
        </div>
      </div>

      {/* Bottom section: admission info + donut */}
      <div className="flex gap-4">
        {/* Admission details */}
        <div className="flex-1 border border-gray-200 rounded-lg p-4 bg-white">
          <div className="grid grid-cols-2 gap-x-8 gap-y-2">
            <InfoRow label="Case ID"        value={admission.caseNumber} />
            <InfoRow label="Reference"      value={admission.reference} />
            <InfoRow label="IPD No"         value={`IPDN${admission.ipdNumber}`} />
            <InfoRow label="Doctor"         value={admission.doctorId?.name} />
            <InfoRow label="Admission Date" value={admission.admissionDate ? formatDate(admission.admissionDate) : undefined} />
            <InfoRow label="Specialty"      value={admission.doctorId?.specialization} />
            <InfoRow label="Bed"            value={bedDisplay} />
            {admission.dischargeDate && (
              <InfoRow label="Discharge Date" value={formatDate(admission.dischargeDate)} />
            )}
            <InfoRow label="Chief Complaint"       value={admission.chiefComplaint} />
            <InfoRow label="Symptoms Type"         value={admission.symptomsType} />
            <InfoRow label="Symptoms Title"        value={admission.symptomsTitle} />
            <InfoRow label="Prev. Medical Issue"   value={admission.previousMedicalIssue} />
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {admission.casualty     && <Badge className="bg-red-100    text-red-700    border-0 text-[10px]">Casualty</Badge>}
            {admission.isOldPatient && <Badge className="bg-purple-100 text-purple-700 border-0 text-[10px]">Old Patient</Badge>}
            {admission.isAntenatal  && <Badge className="bg-pink-100   text-pink-700   border-0 text-[10px]">Antenatal</Badge>}
            {admission.liveConsultation && <Badge className="bg-blue-100 text-blue-700 border-0 text-[10px]">Live Consultation</Badge>}
          </div>
        </div>

        {/* Donut chart */}
        <div className="w-56 shrink-0 border border-gray-200 rounded-lg p-4 bg-white flex items-center justify-center">
          <DonutChart pct={100} />
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function IpdProfilePage() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()
  const [admission, setAdmission] = useState<IpdDetail | null>(null)
  const [loading, setLoading]     = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    fetch(`/api/dashboard/ipd/${id}`)
      .then(r => r.json())
      .then(d => { if (d.success) setAdmission(d.data) })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <BedDouble className="w-10 h-10 animate-pulse" />
          <p className="text-sm">Loading patient…</p>
        </div>
      </div>
    )
  }

  if (!admission) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-gray-400">
          <p className="text-sm font-medium">IPD record not found</p>
          <button onClick={() => router.back()} className="mt-2 text-xs text-blue-600 hover:underline">
            ← Back to IPD
          </button>
        </div>
      </div>
    )
  }

  const p = admission.patientId

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-hidden">
      {/* ── Tab bar ── */}
      <div className="bg-white border-b border-gray-200 shrink-0">
        {/* Back + patient name row */}
        <div className="flex items-center gap-3 px-4 pt-3 pb-2">
          <button
            onClick={() => router.push('/dashboard/ipd')}
            className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
              {p?.name ?? 'Patient'}
            </h1>
            <Badge
              className={admission.status === 'ADMITTED'
                ? 'bg-green-100 text-green-700 border-0 text-[10px]'
                : 'bg-orange-100 text-orange-700 border-0 text-[10px]'}
            >
              {admission.status}
            </Badge>
          </div>
          <span className="ml-auto text-xs font-mono text-blue-600 font-semibold">
            IPDN{admission.ipdNumber}
          </span>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto scrollbar-none px-4 gap-0">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={[
                'shrink-0 px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap',
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'overview'            && <OverviewTab admission={admission} />}
        {activeTab === 'nurse-notes'         && <PlaceholderTab label="Nurse Notes" />}
        {activeTab === 'medication'          && <PlaceholderTab label="Medication" />}
        {activeTab === 'prescription'        && <PlaceholderTab label="Prescription" />}
        {activeTab === 'consultant-register' && <PlaceholderTab label="Consultant Register" />}
        {activeTab === 'lab-investigation'   && <PlaceholderTab label="Lab Investigation" />}
        {activeTab === 'operations'          && <PlaceholderTab label="Operations" />}
        {activeTab === 'charges'             && <PlaceholderTab label="Charges" />}
        {activeTab === 'payments'            && <PlaceholderTab label="Payments" />}
        {activeTab === 'live-consultation'   && <PlaceholderTab label="Live Consultation" />}
      </div>
    </div>
  )
}
