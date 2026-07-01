'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useApp, useCurrency } from '@/lib/context'
import { ArrowLeft, Pencil, User, Phone, Mail, MapPin, Heart, Shield, AlertCircle, Hash, Users } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { printOpdReceipt } from '@/components/patients/OpdReceiptPrinter'
import { printPathologyBillReceipt } from '@/components/pathology/PathologyBillPrinter'
import { printPharmacyBillReceipt } from '@/components/pharmacy/PharmacyBillPrinter'
import { PatientForm, type PatientFormData } from '@/components/patients/PatientForm'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Printer } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Patient {
  _id: string; patientCode?: number; name: string; guardianName?: string
  gender?: string; age: number; ageMonths?: number; ageDays?: number
  bloodGroup?: string; maritalStatus?: string; phone?: string; email?: string
  address?: string; remarks?: string; allergies?: string
  tpa?: string; tpaId?: string; tpaValidity?: string; nationalId?: string
  alternateNumber?: string; createdAt: string
}

interface OpdVisit {
  _id: string; opdNumber: number; visitDate: string
  doctorId?: { name: string; specialization?: string } | null
  chiefComplaint?: string
  charges: { name: string; fee: number }[]
  paidAmount: number; createdAt: string
}

interface IpdAdmission {
  _id: string; ipdn?: string; admissionDate: string; dischargeDate?: string
  status: 'ADMITTED' | 'DISCHARGED'
  bedGroup?: string; bedNumber?: string
  doctorId?: { name: string; specialization?: string } | null
  creditLimit?: number; caseType?: string
}

interface PharmacyBill {
  _id: string
  billNumber: number
  caseId?: string
  doctorName?: string
  lines: {
    medicineName: string; quantity: number; salePrice: number
    taxPercent: number; discountPercent: number; amount: number
    batchNo?: string; expiryDate?: string
  }[]
  totalAmount: number
  discountAmount: number
  taxAmount: number
  netAmount: number
  paidAmount: number
  paymentMode: string
  createdAt: string
}

interface PathologyBill {
  _id: string; billNo: string; billDate: string
  items: { testName: string; reportDate?: string; charge: number; tax: number; amount: number }[]
  amount: number; discount: number; netAmount: number; paidAmount: number; balance: number
  referenceDoctor?: string; paymentMode?: string; note?: string; previousReportValue?: string
  caseId?: string
}

interface History {
  opd:       OpdVisit[]
  ipd:       IpdAdmission[]
  pharmacy:  PharmacyBill[]
  pathology: PathologyBill[]
}

// ── Helpers ────────────────────────────────────────────────────────────────────

type TabKey = 'opd' | 'ipd' | 'pharmacy' | 'pathology'
const TABS: { key: TabKey; label: string }[] = [
  { key: 'opd',       label: 'OPD History'      },
  { key: 'ipd',       label: 'IPD History'       },
  { key: 'pharmacy',  label: 'Pharmacy Bills'    },
  { key: 'pathology', label: 'Pathology Bills'   },
]

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <Icon className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-gray-400 leading-none">{label}</p>
        <p className="text-xs text-gray-800 mt-0.5 break-words">{value}</p>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ADMITTED:   'bg-blue-100 text-blue-700',
    DISCHARGED: 'bg-green-100 text-green-700',
  }
  return (
    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${colors[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="py-12 text-center text-sm text-gray-400">No {label} found</div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PatientProfilePage() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()
  const { tenant } = useApp()
  const { sym, fmt } = useCurrency()

  const [patient,  setPatient]  = useState<Patient | null>(null)
  const [history,  setHistory]  = useState<History | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [hLoading, setHLoading] = useState(true)
  const [tab,      setTab]      = useState<TabKey>('opd')
  const [editOpen, setEditOpen] = useState(false)

  // Load patient
  useEffect(() => {
    fetch(`/api/dashboard/patients/${id}`)
      .then(r => r.json())
      .then(d => { if (d.success) setPatient(d.data) })
      .finally(() => setLoading(false))
  }, [id])

  // Load history
  useEffect(() => {
    setHLoading(true)
    fetch(`/api/dashboard/patients/${id}/history`)
      .then(r => r.json())
      .then(d => { if (d.success) setHistory(d.data) })
      .finally(() => setHLoading(false))
  }, [id])

  async function handleEdit(body: PatientFormData) {
    const res  = await fetch(`/api/dashboard/patients/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    const data = await res.json()
    if (data.success) { setPatient(data.data); setEditOpen(false) }
  }

  function printOpd(visit: OpdVisit) {
    if (!patient) return
    printOpdReceipt({
      opdNumber:          visit.opdNumber,
      visitDate:          visit.visitDate,
      visitTime:          '',
      patientName:        patient.name,
      patientCode:        patient.patientCode,
      patientAge:         patient.age,
      patientAgeMonths:   patient.ageMonths,
      patientAgeDays:     patient.ageDays,
      patientGender:      patient.gender,
      patientBloodGroup:  patient.bloodGroup,
      patientAllergies:   patient.allergies,
      patientAddress:     patient.address,
      doctorName:         visit.doctorId?.name,
      doctorSpecialization: visit.doctorId?.specialization,
      chiefComplaint:     visit.chiefComplaint ?? '',
      charges:            visit.charges,
      totalFee:           visit.paidAmount,
      clinicName:         tenant?.name ?? 'Clinic',
      clinicAddress:      tenant?.address,
      clinicPhone:        tenant?.whatsappNumber,
      logoUrl:            tenant?.logoUrl,
    })
  }

  function printPath(bill: PathologyBill) {
    if (!patient) return
    const taxTotal = bill.items.reduce((s, i) => s + i.charge * i.tax / 100, 0)
    printPathologyBillReceipt({
      billNo:              bill.billNo,
      billDate:            bill.billDate,
      caseId:              bill.caseId,
      patientName:         patient.name,
      patientCode:         patient.patientCode ? String(patient.patientCode) : undefined,
      referenceDoctor:     bill.referenceDoctor,
      note:                bill.note,
      previousReportValue: bill.previousReportValue,
      items:               bill.items,
      totalAmount:         bill.amount,
      discountAmount:      bill.discount,
      taxAmount:           taxTotal,
      netAmount:           bill.netAmount,
      paidAmount:          bill.paidAmount,
      balance:             bill.balance,
      paymentMode:         bill.paymentMode,
      clinicName:          tenant?.name ?? 'Clinic',
      clinicAddress:       tenant?.address,
      clinicPhone:         tenant?.whatsappNumber,
      logoUrl:             tenant?.logoUrl,
      currencySymbol:      sym,
    })
  }

  function printPhar(bill: PharmacyBill) {
    if (!patient) return
    printPharmacyBillReceipt({
      billNumber:    bill.billNumber,
      billDate:      bill.createdAt ? new Date(bill.createdAt).toLocaleDateString('en-IN') : '',
      patientName:   patient.name,
      patientCode:   patient.patientCode ? String(patient.patientCode) : undefined,
      doctorName:    bill.doctorName,
      lines:         (bill.lines ?? []).map(l => ({
        medicineName:    l.medicineName,
        batchNo:         l.batchNo,
        expiryDate:      l.expiryDate,
        quantity:        l.quantity,
        salePrice:       l.salePrice,
        taxPercent:      l.taxPercent,
        discountPercent: l.discountPercent,
        amount:          l.amount,
      })),
      totalAmount:   bill.totalAmount,
      discountAmount: bill.discountAmount,
      taxAmount:     bill.taxAmount,
      netAmount:     bill.netAmount,
      paidAmount:    bill.paidAmount,
      paymentMode:   bill.paymentMode,
      clinicName:    tenant?.name ?? 'Clinic',
      clinicAddress: tenant?.address,
      clinicPhone:   tenant?.whatsappNumber,
      logoUrl:       tenant?.logoUrl,
    })
  }

  const ageParts = patient ? [
    patient.age ? `${patient.age}y` : null,
    patient.ageMonths ? `${patient.ageMonths}m` : null,
    patient.ageDays ? `${patient.ageDays}d` : null,
  ].filter(Boolean).join(' ') : ''

  const initials = patient?.name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() ?? '?'

  // ── Tab counts ──
  const counts = {
    opd:       history?.opd.length       ?? 0,
    ipd:       history?.ipd.length       ?? 0,
    pharmacy:  history?.pharmacy.length  ?? 0,
    pathology: history?.pathology.length ?? 0,
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">

      {/* Edit dialog */}
      {editOpen && patient && (
        <Dialog open onOpenChange={setEditOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Patient</DialogTitle>
            </DialogHeader>
            <PatientForm
              initial={patient as unknown as Partial<PatientFormData>}
              onSave={handleEdit}
              onClose={() => setEditOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* ── Top bar ── */}
      <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center gap-3 shrink-0">
        <button onClick={() => router.push('/dashboard/patients')}
          className="p-1.5 rounded hover:bg-gray-100 text-gray-500">
          <ArrowLeft className="w-4 h-4" />
        </button>
        {loading ? (
          <Skeleton className="h-5 w-40" />
        ) : (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <h1 className="text-sm font-bold text-gray-900 uppercase truncate">{patient?.name}</h1>
            {patient?.patientCode && (
              <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-mono">
                {patient.patientCode}
              </span>
            )}
            {patient?.gender && (
              <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{patient.gender}</span>
            )}
          </div>
        )}
        <button onClick={() => setEditOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 ml-auto shrink-0">
          <Pencil className="w-3 h-3" /> Edit
        </button>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 flex gap-4 p-4 min-h-0 overflow-hidden">

        {/* ── Left panel ── */}
        <div className="w-64 shrink-0 flex flex-col gap-3">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            {/* Avatar */}
            <div className="flex flex-col items-center mb-3">
              <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-bold mb-2">
                {initials}
              </div>
              {loading ? <Skeleton className="h-4 w-24" /> : (
                <p className="text-sm font-semibold text-gray-900 text-center">{patient?.name}</p>
              )}
              {patient?.patientCode && (
                <p className="text-[10px] text-gray-400 font-mono">{patient.patientCode}</p>
              )}
            </div>

            <div className="border-t border-gray-100 pt-3 space-y-0.5">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full mb-1" />)
              ) : (
                <>
                  <InfoRow icon={User}         label="Gender"       value={patient?.gender} />
                  <InfoRow icon={User}         label="Age"          value={ageParts || undefined} />
                  <InfoRow icon={Users}        label="Guardian"     value={patient?.guardianName} />
                  <InfoRow icon={Phone}        label="Phone"        value={patient?.phone} />
                  <InfoRow icon={Phone}        label="Alt. Phone"   value={patient?.alternateNumber} />
                  <InfoRow icon={Mail}         label="Email"        value={patient?.email} />
                  <InfoRow icon={MapPin}       label="Address"      value={patient?.address} />
                  <InfoRow icon={Heart}        label="Blood Group"  value={patient?.bloodGroup} />
                  <InfoRow icon={AlertCircle}  label="Allergies"    value={patient?.allergies} />
                  <InfoRow icon={Shield}       label="TPA"          value={patient?.tpa} />
                  <InfoRow icon={Hash}         label="TPA ID"       value={patient?.tpaId} />
                  <InfoRow icon={Hash}         label="TPA Validity" value={patient?.tpaValidity} />
                  <InfoRow icon={Hash}         label="National ID"  value={patient?.nationalId} />
                  {patient?.remarks && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <p className="text-[10px] text-gray-400 mb-1">Remarks</p>
                      <p className="text-xs text-gray-600">{patient.remarks}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Visit summary */}
          {!hLoading && (
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-600 mb-2">Visit Summary</p>
              <div className="space-y-1.5">
                {[
                  { label: 'OPD Visits',       count: counts.opd      },
                  { label: 'IPD Admissions',   count: counts.ipd      },
                  { label: 'Pharmacy Bills',   count: counts.pharmacy  },
                  { label: 'Pathology Bills',  count: counts.pathology },
                ].map(r => (
                  <div key={r.label} className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{r.label}</span>
                    <span className="text-xs font-semibold text-gray-800">{r.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right panel ── */}
        <div className="flex-1 flex flex-col bg-white border border-gray-200 rounded-lg overflow-hidden min-w-0">

          {/* Tabs */}
          <div className="flex border-b border-gray-200 shrink-0">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                  tab === t.key
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                {t.label}
                {!hLoading && counts[t.key] > 0 && (
                  <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                    tab === t.key ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {counts[t.key]}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-auto">
            {hLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : (
              <>
                {/* OPD */}
                {tab === 'opd' && (
                  history?.opd.length === 0 ? <EmptyState label="OPD visits" /> : (
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium text-gray-600 w-20">OPD No</th>
                          <th className="text-left px-3 py-2 font-medium text-gray-600 w-24">Date</th>
                          <th className="text-left px-3 py-2 font-medium text-gray-600">Doctor</th>
                          <th className="text-left px-3 py-2 font-medium text-gray-600">Complaint</th>
                          <th className="text-right px-3 py-2 font-medium text-gray-600 w-24">Paid</th>
                          <th className="w-8" />
                        </tr>
                      </thead>
                      <tbody>
                        {history?.opd.map(v => (
                          <tr key={v._id} className="border-t border-gray-100 hover:bg-gray-50">
                            <td className="px-3 py-2 font-mono text-blue-700">OPD{String(v.opdNumber).padStart(3,'0')}</td>
                            <td className="px-3 py-2 text-gray-500">{v.visitDate}</td>
                            <td className="px-3 py-2 text-gray-700">{v.doctorId?.name ?? '—'}</td>
                            <td className="px-3 py-2 text-gray-500 max-w-xs truncate">{v.chiefComplaint || '—'}</td>
                            <td className="px-3 py-2 text-right font-mono text-gray-800">{fmt(v.paidAmount)}</td>
                            <td className="px-2 py-2">
                              <button onClick={() => printOpd(v)}
                                title="Print" className="p-1 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600">
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )
                )}

                {/* IPD */}
                {tab === 'ipd' && (
                  history?.ipd.length === 0 ? <EmptyState label="IPD admissions" /> : (
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium text-gray-600 w-28">Admission Date</th>
                          <th className="text-left px-3 py-2 font-medium text-gray-600 w-24">Discharge</th>
                          <th className="text-left px-3 py-2 font-medium text-gray-600">Doctor</th>
                          <th className="text-left px-3 py-2 font-medium text-gray-600 w-24">Bed</th>
                          <th className="text-left px-3 py-2 font-medium text-gray-600 w-20">Status</th>
                          <th className="text-right px-3 py-2 font-medium text-gray-600 w-24">Credit Limit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history?.ipd.map(a => (
                          <tr key={a._id} className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer"
                            onClick={() => router.push(`/dashboard/ipd/${a._id}`)}>
                            <td className="px-3 py-2 text-gray-700">{a.admissionDate}</td>
                            <td className="px-3 py-2 text-gray-500">{a.dischargeDate ?? '—'}</td>
                            <td className="px-3 py-2 text-gray-700">{a.doctorId?.name ?? '—'}</td>
                            <td className="px-3 py-2 text-gray-500">{[a.bedGroup, a.bedNumber].filter(Boolean).join(' / ') || '—'}</td>
                            <td className="px-3 py-2"><StatusBadge status={a.status} /></td>
                            <td className="px-3 py-2 text-right font-mono text-gray-700">{a.creditLimit ? fmt(a.creditLimit) : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )
                )}

                {/* Pharmacy */}
                {tab === 'pharmacy' && (
                  history?.pharmacy.length === 0 ? <EmptyState label="pharmacy bills" /> : (
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium text-gray-600 w-28">Bill No</th>
                          <th className="text-left px-3 py-2 font-medium text-gray-600 w-24">Date</th>
                          <th className="text-left px-3 py-2 font-medium text-gray-600 w-14">Items</th>
                          <th className="text-left px-3 py-2 font-medium text-gray-600">Doctor</th>
                          <th className="text-right px-3 py-2 font-medium text-gray-600 w-24">Net Amount</th>
                          <th className="text-right px-3 py-2 font-medium text-gray-600 w-24">Paid</th>
                          <th className="text-right px-3 py-2 font-medium text-gray-600 w-24">Balance</th>
                          <th className="w-8" />
                        </tr>
                      </thead>
                      <tbody>
                        {history?.pharmacy.map(b => {
                          const balance = b.netAmount - b.paidAmount
                          return (
                            <tr key={b._id} className="border-t border-gray-100 hover:bg-gray-50">
                              <td className="px-3 py-2 font-mono text-blue-700">PHARMAB{b.billNumber}</td>
                              <td className="px-3 py-2 text-gray-500">
                                {b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-IN') : '—'}
                              </td>
                              <td className="px-3 py-2 text-center text-gray-600">{b.lines?.length ?? 0}</td>
                              <td className="px-3 py-2 text-gray-500">{b.doctorName || '—'}</td>
                              <td className="px-3 py-2 text-right font-mono text-gray-800">{fmt(b.netAmount)}</td>
                              <td className="px-3 py-2 text-right font-mono text-green-700">{fmt(b.paidAmount)}</td>
                              <td className="px-3 py-2 text-right font-mono font-semibold"
                                style={{ color: balance > 0 ? '#dc2626' : '#16a34a' }}>
                                {fmt(balance)}
                              </td>
                              <td className="px-2 py-2">
                                <button onClick={() => printPhar(b)}
                                  title="Print" className="p-1 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600">
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )
                )}

                {/* Pathology */}
                {tab === 'pathology' && (
                  history?.pathology.length === 0 ? <EmptyState label="pathology bills" /> : (
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium text-gray-600 w-24">Bill No</th>
                          <th className="text-left px-3 py-2 font-medium text-gray-600 w-24">Date</th>
                          <th className="text-left px-3 py-2 font-medium text-gray-600 w-14">Tests</th>
                          <th className="text-left px-3 py-2 font-medium text-gray-600">Ref. Doctor</th>
                          <th className="text-right px-3 py-2 font-medium text-gray-600 w-24">Net Amount</th>
                          <th className="text-right px-3 py-2 font-medium text-gray-600 w-24">Paid</th>
                          <th className="text-right px-3 py-2 font-medium text-gray-600 w-24">Balance</th>
                          <th className="w-8" />
                        </tr>
                      </thead>
                      <tbody>
                        {history?.pathology.map(b => (
                          <tr key={b._id} className="border-t border-gray-100 hover:bg-gray-50">
                            <td className="px-3 py-2 font-mono text-blue-700">{b.billNo}</td>
                            <td className="px-3 py-2 text-gray-500">{b.billDate}</td>
                            <td className="px-3 py-2 text-center text-gray-600">{b.items?.length ?? 0}</td>
                            <td className="px-3 py-2 text-gray-500">{b.referenceDoctor || '—'}</td>
                            <td className="px-3 py-2 text-right font-mono text-gray-800">{fmt(b.netAmount)}</td>
                            <td className="px-3 py-2 text-right font-mono text-green-700">{fmt(b.paidAmount)}</td>
                            <td className="px-3 py-2 text-right font-mono font-semibold"
                              style={{ color: b.balance > 0 ? '#dc2626' : '#16a34a' }}>
                              {fmt(b.balance)}
                            </td>
                            <td className="px-2 py-2">
                              <button onClick={() => printPath(b)}
                                title="Print" className="p-1 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600">
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
