'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { useApp } from '@/lib/context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { SearchableSelect } from '@/components/ui/searchable-select'
import {
  ChevronLeft, ChevronRight, Plus, Search, X,
  Phone, Printer, Loader2, ClipboardList, PenLine, ChevronDown,
} from 'lucide-react'
import { printOpdReceipt } from '@/components/patients/OpdReceiptPrinter'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import { PrescriptionForm, type OpdVisitForPrescription } from '@/components/opd/PrescriptionForm'
import { ManualPrescriptionForm } from '@/components/opd/ManualPrescriptionForm'
import { PatientForm, type PatientFormData } from '@/components/patients/PatientForm'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { todayString, formatDate } from '@/lib/format'

// ── Types ────────────────────────────────────────────────────────────────────

type Tab = 'today' | 'upcoming' | 'old' | 'patients'
type OpdStatus = 'WAITING' | 'IN_PROGRESS' | 'COMPLETED'

interface PatientOption {
  _id: string
  patientCode?: number
  name: string
  age: number
  ageMonths?: number
  ageDays?: number
  gender?: string
  phone?: string
  email?: string
  address?: string
  guardianName?: string
  bloodGroup?: string
  allergies?: string
  remarks?: string
  tpa?: string
  tpaId?: string
  tpaValidity?: string
  nationalId?: string
}

interface Doctor { _id: string; name: string; specialization: string }
interface ChargeCategory { _id: string; name: string; defaultFee: number; isActive: boolean }

interface OpdVisit {
  _id: string
  opdNumber: number
  visitDate: string
  chiefComplaint: string
  symptomsType?: string
  symptomsTitle?: string
  previousMedicalIssue?: string
  caseNumber?: string
  reference?: string
  isAntenatal?: boolean
  charges: { name: string; fee: number }[]
  totalFee: number
  appliedCharge?: number
  discount?: number
  tax?: number
  paymentMode?: string
  paidAmount?: number
  status: OpdStatus
  patientId: {
    _id: string; name: string; age: number; ageMonths?: number; ageDays?: number
    patientCode?: number; gender?: string; address?: string; bloodGroup?: string; allergies?: string
  } | null
  doctorId: { name: string; specialization: string } | null
  createdBy?: { userId: string; name: string }
  createdAt: string
}


const TABS: { key: Tab; label: string }[] = [
  { key: 'today',    label: 'Today OPD' },
  { key: 'upcoming', label: 'Upcoming OPD' },
  { key: 'old',      label: 'Old OPD' },
  { key: 'patients', label: 'Patient View' },
]

const PAYMENT_MODES = ['CASH', 'CARD', 'UPI', 'CHEQUE', 'ONLINE']

// ── Patient combobox ─────────────────────────────────────────────────────────

function PatientCombobox({
  value, onChange,
}: {
  value: PatientOption | null
  onChange: (p: PatientOption) => void
}) {
  const [open, setOpen]       = useState(false)
  const [query, setQuery]     = useState('')
  const [options, setOptions] = useState<PatientOption[]>([])
  const containerRef          = useRef<HTMLDivElement>(null)
  const inputRef              = useRef<HTMLInputElement>(null)
  const timerRef              = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!query.trim()) { setOptions([]); return }
    timerRef.current = setTimeout(async () => {
      const res  = await fetch(`/api/dashboard/patients?search=${encodeURIComponent(query)}&limit=20`)
      const data = await res.json()
      if (data.success) setOptions(data.data.patients ?? [])
    }, 250)
  }, [query])

  function openDropdown() {
    setOpen(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  function select(p: PatientOption) {
    onChange(p)
    setOpen(false)
    setQuery('')
    setOptions([])
  }

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger */}
      <button
        type="button"
        onClick={openDropdown}
        className="w-full h-10 flex items-center justify-between px-3 border border-gray-200 rounded-lg bg-white text-sm hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors"
      >
        {value ? (
          <span className="font-medium text-gray-900 truncate">
            {value.name}
            {value.patientCode ? <span className="ml-1.5 text-gray-400 font-normal text-xs">({value.patientCode})</span> : null}
          </span>
        ) : (
          <span className="text-gray-400">Search patient…</span>
        )}
        <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 ml-2" />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-30 overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Type patient name…"
                className="w-full h-8 pl-8 pr-3 text-sm rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
          </div>
          {/* Options */}
          <div className="max-h-60 overflow-y-auto">
            {query.trim() === '' ? (
              <p className="py-5 text-center text-xs text-gray-400">Type a name to search patients</p>
            ) : options.length === 0 ? (
              <p className="py-5 text-center text-xs text-gray-400">No patients found for "{query}"</p>
            ) : (
              options.map(p => (
                <button
                  key={p._id}
                  type="button"
                  onMouseDown={() => select(p)}
                  className={`w-full text-left px-3 py-2.5 border-b border-gray-50 last:border-0 hover:bg-blue-50 transition-colors ${
                    value?._id === p._id ? 'bg-blue-50' : ''
                  }`}
                >
                  <span className="text-sm font-medium text-gray-900">{p.name}</span>
                  {p.patientCode && <span className="ml-2 text-xs text-gray-400">({p.patientCode})</span>}
                  {p.age > 0 && <span className="ml-2 text-xs text-gray-500">{p.age} yr</span>}
                  {p.gender && <span className="ml-1 text-xs text-gray-400">· {p.gender}</span>}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Add OPD full-screen form ─────────────────────────────────────────────────

function OpdAddForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { tenant } = useApp()

  const [selectedPatient, setSelectedPatient] = useState<PatientOption | null>(null)
  const [showAddPatient, setShowAddPatient]   = useState(false)

  // reference data
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [categories, setCategories] = useState<ChargeCategory[]>([])

  // form state
  const [visitDate, setVisitDate] = useState(todayString())
  const [caseNumber, setCaseNumber] = useState('')
  const [casualty, setCasualty] = useState(false)
  const [isOldPatient, setIsOldPatient] = useState(false)
  const [reference, setReference] = useState('')
  const [doctorId, setDoctorId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [applyTpa, setApplyTpa] = useState(false)
  const [chargeItem, setChargeItem] = useState('')
  const [standardCharge, setStandardCharge] = useState('')
  const [appliedCharge, setAppliedCharge] = useState('')
  const [discount, setDiscount] = useState('0')
  const [tax, setTax] = useState('0')
  const [paymentMode, setPaymentMode] = useState('CASH')
  const [paidAmount, setPaidAmount] = useState('')
  const [liveConsultation, setLiveConsultation] = useState(false)
  const [symptomsType, setSymptomsType] = useState('')
  const [symptomsTitle, setSymptomsTitle] = useState('')
  const [symptomsDescription, setSymptomsDescription] = useState('')
  const [note, setNote] = useState('')
  const [knownAllergies, setKnownAllergies] = useState('')
  const [previousMedicalIssue, setPreviousMedicalIssue] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // computed amount
  const applied = Number(appliedCharge) || 0
  const disc    = Number(discount) || 0
  const taxPct  = Number(tax) || 0
  const amount  = Math.max(0, applied - disc + (applied - disc) * taxPct / 100)

  useEffect(() => {
    Promise.all([
      fetch('/api/dashboard/doctors').then(r => r.json()),
      fetch('/api/dashboard/charges').then(r => r.json()),
    ]).then(([docData, chargeData]) => {
      if (docData.success) setDoctors(docData.data)
      if (chargeData.success) setCategories(chargeData.data.filter((c: ChargeCategory) => c.isActive))
    })
  }, [])

  // auto-fill standard charge when category changes
  useEffect(() => {
    const cat = categories.find(c => c._id === categoryId)
    if (cat) {
      setChargeItem(cat.name)
      setStandardCharge(String(cat.defaultFee))
      setAppliedCharge(String(cat.defaultFee))
    }
  }, [categoryId, categories])

  // auto-fill paid amount = amount
  useEffect(() => {
    if (amount > 0) setPaidAmount(String(Math.round(amount)))
  }, [amount])

  function selectPatient(p: PatientOption) {
    setSelectedPatient(p)
    if (p.allergies) setKnownAllergies(p.allergies)
  }

  async function handleSubmit(print = false) {
    if (!selectedPatient) { toast.error('Please select a patient'); return }
    if (!visitDate)        { toast.error('Appointment date is required'); return }
    setSubmitting(true)
    try {
      const chargeLines = chargeItem ? [{ categoryId: categoryId || undefined, name: chargeItem, fee: Number(appliedCharge) || 0 }] : []
      const res = await fetch('/api/dashboard/opd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selectedPatient._id,
          doctorId: doctorId || undefined,
          visitDate,
          chiefComplaint: symptomsDescription.trim() || symptomsTitle.trim(),
          symptomsType: symptomsType.trim(),
          symptomsTitle: symptomsTitle.trim(),
          note: note.trim(),
          knownAllergiesOverride: knownAllergies.trim(),
          previousMedicalIssue: previousMedicalIssue.trim(),
          caseNumber: caseNumber.trim(),
          reference: reference.trim(),
          casualty,
          isOldPatient,
          liveConsultation,
          applyTpa,
          charges: chargeLines,
          totalFee: amount || Number(appliedCharge) || 0,
          appliedCharge: Number(appliedCharge) || undefined,
          discount: Number(discount) || 0,
          tax: Number(tax) || 0,
          paymentMode,
          paidAmount: Number(paidAmount) || 0,
        }),
      })
      const data = await res.json()
      if (!data.success) { toast.error(data.error); return }

      const { opdNumber, doctor } = data.data
      toast.success(`OPD #${String(opdNumber).padStart(3, '0')} created`)

      if (print) {
        const now = new Date()
        printOpdReceipt({
          opdNumber,
          caseNumber: caseNumber.trim() || undefined,
          visitDate: visitDate,
          visitTime: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
          patientName: selectedPatient.name,
          patientCode: selectedPatient.patientCode,
          patientAge: selectedPatient.age,
          patientAgeMonths: selectedPatient.ageMonths,
          patientAgeDays: (selectedPatient as PatientOption & { ageDays?: number }).ageDays,
          patientGender: selectedPatient.gender,
          patientBloodGroup: selectedPatient.bloodGroup,
          patientAllergies: knownAllergies.trim() || selectedPatient.allergies,
          patientAddress: selectedPatient.address,
          previousMedicalIssue: previousMedicalIssue.trim() || undefined,
          doctorName: doctor?.name,
          doctorSpecialization: doctor?.specialization,
          chiefComplaint: symptomsDescription.trim() || symptomsTitle.trim(),
          charges: chargeLines,
          appliedCharge: Number(appliedCharge) || undefined,
          discount: Number(discount) || 0,
          tax: Number(tax) || 0,
          totalFee: amount || Number(appliedCharge) || 0,
          clinicName: tenant?.name ?? 'Clinic',
          clinicAddress: tenant?.address || undefined,
        })
      }

      onSaved()
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  const inp = 'h-9 text-sm w-full'
  const lbl = 'text-sm font-medium text-gray-700 mb-1 block'
  const sel = 'h-9 text-sm w-full'

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col overflow-hidden">
      {/* ── Top bar: patient select ── */}
      <div className="h-12 bg-blue-600 flex items-center gap-2 px-3 shrink-0">
        <div className="flex-1 min-w-0">
          <PatientCombobox value={selectedPatient} onChange={selectPatient} />
        </div>
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 h-9 gap-1.5 text-xs bg-white/10 border-white/30 text-white hover:bg-white/20"
          onClick={() => setShowAddPatient(true)}
        >
          <Plus className="w-3.5 h-3.5" /> New Patient
        </Button>
        <button onClick={onClose} className="p-1.5 text-white/80 hover:text-white shrink-0">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 min-h-0 bg-gray-50">

        {/* Left: Clinical fields */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 border-r border-gray-200 bg-white">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={lbl}>Symptoms Type</label>
              <Input className={inp} value={symptomsType} onChange={e => setSymptomsType(e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Symptoms Title</label>
              <Input className={inp} value={symptomsTitle} onChange={e => setSymptomsTitle(e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Symptoms Description</label>
              <Input className={inp} value={symptomsDescription} onChange={e => setSymptomsDescription(e.target.value)} />
            </div>
          </div>

          <div>
            <label className={lbl}>Any Known Allergies</label>
            <Textarea rows={3} className="text-sm resize-none w-full" value={knownAllergies} onChange={e => setKnownAllergies(e.target.value)} placeholder="Penicillin, Aspirin…" />
          </div>

          <div>
            <label className={lbl}>Previous Medical Issue</label>
            <Textarea rows={3} className="text-sm resize-none w-full" value={previousMedicalIssue} onChange={e => setPreviousMedicalIssue(e.target.value)} placeholder="Diabetes, Hypertension…" />
          </div>

          <div>
            <label className={lbl}>Note</label>
            <Textarea rows={4} className="text-sm resize-none w-full" value={note} onChange={e => setNote(e.target.value)} />
          </div>
        </div>

        {/* Right: Visit details + billing */}
        <div className="w-96 shrink-0 overflow-y-auto p-5 space-y-3 bg-gray-50">
          {/* Appointment Date */}
          <div>
            <label className={lbl}>Appointment Date <span className="text-red-500">*</span></label>
            <Input type="date" className={inp} value={visitDate} onChange={e => setVisitDate(e.target.value)} />
          </div>

          {/* Case | Reference */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Case</label>
              <Input className={inp} value={caseNumber} onChange={e => setCaseNumber(e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Reference</label>
              <Input className={inp} value={reference} onChange={e => setReference(e.target.value)} />
            </div>
          </div>

          {/* Casualty | Old Patient */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Casualty</label>
              <Select value={casualty ? 'yes' : 'no'} onValueChange={v => setCasualty(v === 'yes')}>
                <SelectTrigger className={sel}><SelectValue>{casualty ? 'Yes' : 'No'}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="yes">Yes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className={lbl}>Old Patient</label>
              <Select value={isOldPatient ? 'yes' : 'no'} onValueChange={v => setIsOldPatient(v === 'yes')}>
                <SelectTrigger className={sel}><SelectValue>{isOldPatient ? 'Yes' : 'No'}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="yes">Yes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Live Consultation */}
          <div>
            <label className={lbl}>Live Consultation</label>
            <Select value={liveConsultation ? 'yes' : 'no'} onValueChange={v => setLiveConsultation(v === 'yes')}>
              <SelectTrigger className={sel}><SelectValue>{liveConsultation ? 'Yes' : 'No'}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value="no">No</SelectItem>
                <SelectItem value="yes">Yes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Consultant Doctor */}
          <div>
            <label className={lbl}>Consultant Doctor</label>
            <SearchableSelect
              value={doctorId}
              onValueChange={v => setDoctorId(v)}
              options={doctors.map(d => ({ value: d._id, label: d.name, sub: d.specialization }))}
              placeholder="Select"
              searchPlaceholder="Search by name or specialization…"
              emptyText="No doctors found. Add doctors in HR."
              clearable
            />
          </div>

          {/* Divider */}
          <div className="pt-1 border-t border-gray-200">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Billing</p>
          </div>

          {/* Charge Category | Apply TPA */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Charge Category</label>
              <Select value={categoryId} onValueChange={v => setCategoryId(v ?? '')}>
                <SelectTrigger className={sel}>
                  <SelectValue>{categoryId ? (categories.find(c => c._id === categoryId)?.name ?? 'Select') : 'Select'}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer select-none text-sm font-medium text-gray-700 h-9 px-3 rounded-lg border border-gray-200 bg-white w-full">
                <Checkbox checked={applyTpa} onCheckedChange={v => setApplyTpa(Boolean(v))} />
                Apply TPA
              </label>
            </div>
          </div>

          {/* Charge Name | Standard Charge */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Charge Name</label>
              <Input className={inp} value={chargeItem} onChange={e => setChargeItem(e.target.value)} placeholder="OPD Consultation" />
            </div>
            <div>
              <label className={lbl}>Standard (₹)</label>
              <Input className={`${inp} bg-gray-50 text-gray-500`} value={standardCharge} readOnly tabIndex={-1} />
            </div>
          </div>

          {/* Applied Charge | Discount */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Applied (₹)</label>
              <Input className={inp} type="number" min="0" value={appliedCharge} onChange={e => setAppliedCharge(e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className={lbl}>Discount (₹)</label>
              <Input className={inp} type="number" min="0" value={discount} onChange={e => setDiscount(e.target.value)} placeholder="0" />
            </div>
          </div>

          {/* Tax | Amount */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Tax (%)</label>
              <div className="relative">
                <Input className={`${inp} pr-8`} type="number" min="0" value={tax} onChange={e => setTax(e.target.value)} placeholder="0" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
              </div>
            </div>
            <div>
              <label className={lbl}>Amount (₹)</label>
              <Input
                className={`${inp} bg-blue-50 text-blue-800 font-bold border-blue-200`}
                value={amount > 0 ? `₹ ${amount.toFixed(2)}` : ''}
                readOnly tabIndex={-1}
              />
            </div>
          </div>

          {/* Payment Mode | Paid Amount */}
          <div className="grid grid-cols-2 gap-3 pt-1 border-t border-gray-200">
            <div>
              <label className={lbl}>Payment Mode</label>
              <Select value={paymentMode} onValueChange={v => setPaymentMode(v ?? '')}>
                <SelectTrigger className={sel}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_MODES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className={lbl}>Paid (₹)</label>
              <Input className={inp} type="number" min="0" value={paidAmount} onChange={e => setPaidAmount(e.target.value)} placeholder="0" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="h-12 bg-white border-t border-gray-200 flex items-center justify-end gap-3 px-4 shrink-0">
        <Button
          className="h-9 px-5 text-sm gap-2 bg-blue-600 hover:bg-blue-700"
          disabled={submitting}
          onClick={() => handleSubmit(true)}
        >
          <Printer className="w-4 h-4" />
          {submitting ? 'Saving…' : 'Save & Print'}
        </Button>
        <Button
          className="h-9 px-6 text-sm bg-green-600 hover:bg-green-700"
          disabled={submitting}
          onClick={() => handleSubmit(false)}
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
        </Button>
      </div>

      {/* Add Patient dialog */}
      <Dialog open={showAddPatient} onOpenChange={open => !open && setShowAddPatient(false)}>
        <DialogContent className="w-[95vw] sm:max-w-3xl">
          <DialogHeader><DialogTitle>Add New Patient</DialogTitle></DialogHeader>
          <PatientForm
            onClose={() => setShowAddPatient(false)}
            onSave={async (body: PatientFormData) => {
              const res  = await fetch('/api/dashboard/patients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
              })
              const data = await res.json()
              if (!data.success) { toast.error(data.error ?? 'Failed to create patient'); throw new Error(data.error) }
              toast.success(`Patient "${data.data.name}" added`)
              selectPatient({
                _id: data.data._id,
                name: data.data.name,
                patientCode: data.data.patientCode,
                age: data.data.age ?? 0,
                ageMonths: data.data.ageMonths,
                gender: data.data.gender,
                phone: data.data.phone,
                email: data.data.email,
                guardianName: data.data.guardianName,
                bloodGroup: data.data.bloodGroup,
                address: data.data.address,
                allergies: data.data.allergies,
                nationalId: data.data.nationalId,
                tpa: data.data.tpa,
                tpaId: data.data.tpaId,
                tpaValidity: data.data.tpaValidity,
                remarks: data.data.remarks,
              })
              setShowAddPatient(false)
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Main OPD page ─────────────────────────────────────────────────────────────

export default function OpdPage() {
  const { user, tenant } = useApp()
  const [activeTab, setActiveTab] = useState<Tab>('today')
  const [visits, setVisits] = useState<OpdVisit[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(100)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [showAdd, setShowAdd] = useState(false)
  const [prescriptionVisit, setPrescriptionVisit] = useState<OpdVisitForPrescription | null>(null)
  const [manualPrescriptionVisit, setManualPrescriptionVisit] = useState<OpdVisitForPrescription | null>(null)
  const canEdit = user?.role !== 'VIEWER'

  const loadVisits = useCallback(async (tab = activeTab, q = search, pg = page, lim = pageSize) => {
    setLoading(true)
    const params = new URLSearchParams({ tab, page: String(pg), limit: String(lim) })
    if (q) params.set('search', q)
    const res = await fetch(`/api/dashboard/opd?${params}`)
    const data = await res.json()
    if (data.success) {
      setVisits(data.data.visits ?? [])
      setTotal(data.data.total ?? 0)
      setTotalPages(data.data.totalPages ?? 1)
    }
    setLoading(false)
  }, [activeTab, search, page, pageSize])

  useEffect(() => { loadVisits() }, [loadVisits])

  useEffect(() => {
    const id = setTimeout(() => { setPage(1); loadVisits(activeTab, search, 1, pageSize) }, 300)
    return () => clearTimeout(id)
  }, [search])

  function switchTab(tab: Tab) {
    setActiveTab(tab); setPage(1); setSearch(''); loadVisits(tab, '', 1, pageSize)
  }


  function toVisitForPrescription(visit: OpdVisit): OpdVisitForPrescription {
    return {
      _id: visit._id,
      opdNumber: visit.opdNumber,
      visitDate: visit.visitDate,
      caseNumber: visit.caseNumber,
      patientId: visit.patientId ? {
        _id: visit.patientId._id,
        name: visit.patientId.name,
        age: visit.patientId.age,
        ageMonths: visit.patientId.ageMonths,
        ageDays: visit.patientId.ageDays,
        patientCode: visit.patientId.patientCode,
        gender: visit.patientId.gender,
        address: visit.patientId.address,
        bloodGroup: visit.patientId.bloodGroup,
        allergies: visit.patientId.allergies,
      } : null,
      doctorId: visit.doctorId,
    }
  }

  function openPrescription(visit: OpdVisit) {
    setPrescriptionVisit(toVisitForPrescription(visit))
  }

  function printVisitReceipt(visit: OpdVisit) {
    printOpdReceipt({
      opdNumber: visit.opdNumber,
      caseNumber: visit.caseNumber,
      visitDate: visit.visitDate,
      visitTime: new Date(visit.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
      patientName: visit.patientId?.name ?? '',
      patientCode: visit.patientId?.patientCode,
      patientAge: visit.patientId?.age ?? 0,
      patientAgeMonths: visit.patientId?.ageMonths,
      patientGender: visit.patientId?.gender,
      patientBloodGroup: visit.patientId?.bloodGroup,
      patientAllergies: visit.patientId?.allergies,
      patientAddress: visit.patientId?.address,
      previousMedicalIssue: visit.previousMedicalIssue,
      doctorName: visit.doctorId?.name,
      doctorSpecialization: visit.doctorId?.specialization,
      chiefComplaint: visit.chiefComplaint,
      charges: visit.charges ?? [],
      appliedCharge: visit.appliedCharge,
      discount: visit.discount ?? 0,
      tax: visit.tax ?? 0,
      totalFee: visit.totalFee,
      clinicName: tenant?.name ?? 'Clinic',
      clinicAddress: tenant?.address || undefined,
    })
  }

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to   = Math.min(page * pageSize, total)

  const opdColumns: ColumnDef<OpdVisit>[] = [
    {
      key: 'opdNumber', header: 'OPD No', align: 'center', width: 'w-16',
      skeletonWidth: 'w-10',
      sortable: true, sortValue: v => v.opdNumber,
      render: v => (
        <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 text-blue-700 font-bold text-xs">
          {String(v.opdNumber).padStart(3, '0')}
        </span>
      ),
    },
    {
      key: 'patient', header: 'Patient Name',
      skeletonWidth: 'w-32',
      sortable: true, sortValue: v => v.patientId?.name ?? '',
      render: v => (
        <div>
          <p className="text-xs font-medium text-gray-900 whitespace-nowrap">{v.patientId?.name ?? '—'}</p>
          {v.patientId?.gender && <p className="text-xs text-gray-400">{v.patientId.gender}</p>}
        </div>
      ),
    },
    {
      key: 'caseId', header: 'Case ID',
      skeletonWidth: 'w-16',
      render: v => (
        <span className="text-xs text-gray-600 whitespace-nowrap">
          {v.patientId?.patientCode ? `PT${String(v.patientId.patientCode).padStart(4, '0')}` : '—'}
        </span>
      ),
    },
    {
      key: 'visitDate', header: 'Appt. Date',
      skeletonWidth: 'w-24',
      sortable: true, sortValue: v => v.visitDate,
      render: v => (
        <span className="text-xs text-gray-600 whitespace-nowrap">
          {v.visitDate ? new Date(v.visitDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
        </span>
      ),
    },
    {
      key: 'generatedBy', header: 'Generated By',
      skeletonWidth: 'w-24',
      render: v => <span className="text-xs text-gray-500 whitespace-nowrap">{v.createdBy?.name ?? '—'}</span>,
    },
    {
      key: 'consultant', header: 'Consultant',
      skeletonWidth: 'w-24',
      sortable: true, sortValue: v => v.doctorId?.name ?? '',
      render: v => <span className="text-xs text-gray-600 whitespace-nowrap">{v.doctorId?.name ?? '—'}</span>,
    },
    {
      key: 'reference', header: 'Reference',
      skeletonWidth: 'w-20',
      render: v => <span className="text-xs text-gray-500">{v.reference || '—'}</span>,
    },
    {
      key: 'symptoms', header: 'Symptoms', className: 'max-w-40 truncate',
      skeletonWidth: 'w-28',
      render: v => <span className="text-xs text-gray-600">{v.chiefComplaint || '—'}</span>,
    },
    {
      key: 'antenatal', header: 'Antenatal', align: 'center',
      skeletonWidth: 'w-10',
      render: v => v.isAntenatal
        ? <Badge className="bg-pink-100 text-pink-700 border-pink-200 text-xs">Yes</Badge>
        : <span className="text-xs text-gray-400">No</span>,
    },
    {
      key: 'prevIssue', header: 'Prev. Medical Issue', className: 'max-w-40 truncate',
      skeletonWidth: 'w-28',
      render: v => <span className="text-xs text-gray-500">{v.previousMedicalIssue || '—'}</span>,
    },
    {
      key: 'actions', header: 'Action', align: 'center', width: 'w-28',
      skeletonWidth: 'w-20',
      render: v => (
        <TooltipProvider delay={300}>
          <div className="flex items-center justify-center gap-1">
            <Tooltip>
              <TooltipTrigger
                onClick={e => { e.stopPropagation(); printVisitReceipt(v) }}
                className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
              </TooltipTrigger>
              <TooltipContent side="top">Print OPD Bill</TooltipContent>
            </Tooltip>
            {canEdit && (
              <Tooltip>
                <TooltipTrigger
                  onClick={e => { e.stopPropagation(); setManualPrescriptionVisit(toVisitForPrescription(v)) }}
                  className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-purple-600 transition-colors"
                >
                  <PenLine className="w-3.5 h-3.5" />
                </TooltipTrigger>
                <TooltipContent side="top">Manual Prescription</TooltipContent>
              </Tooltip>
            )}
            {canEdit && (
              <Tooltip>
                <TooltipTrigger
                  onClick={e => { e.stopPropagation(); openPrescription(v) }}
                  className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition-colors"
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                </TooltipTrigger>
                <TooltipContent side="top">Add Prescription</TooltipContent>
              </Tooltip>
            )}
          </div>
        </TooltipProvider>
      ),
    },
  ]

  return (
    <>
      {showAdd && (
        <OpdAddForm
          onClose={() => setShowAdd(false)}
          onSaved={() => loadVisits()}
        />
      )}

      {prescriptionVisit && (
        <PrescriptionForm
          visit={prescriptionVisit}
          onClose={() => setPrescriptionVisit(null)}
          clinicName={tenant?.name ?? 'Clinic'}
          clinicAddress={tenant?.address || undefined}
        />
      )}

      {manualPrescriptionVisit && (
        <ManualPrescriptionForm
          visit={manualPrescriptionVisit}
          onClose={() => setManualPrescriptionVisit(null)}
          clinicName={tenant?.name ?? 'Clinic'}
          clinicAddress={tenant?.address || undefined}
        />
      )}

      <div className="h-full flex flex-col bg-white border border-gray-200 rounded-lg overflow-hidden">

        {/* ── Tab bar + Add button ── */}
        <div className="flex items-center justify-between border-b border-gray-200 shrink-0 bg-gray-50">
          <div className="flex">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => switchTab(tab.key)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {canEdit && (
            <Button
              size="sm"
              className="h-8 text-xs gap-1 bg-blue-600 hover:bg-blue-700 mr-3"
              onClick={() => setShowAdd(true)}
            >
              <Plus className="w-3.5 h-3.5" /> Add Patient
            </Button>
          )}
        </div>

        {/* ── Table ── */}
        <DataTable<OpdVisit>
          columns={opdColumns}
          data={visits}
          rowKey={v => v._id}
          loading={loading}
          skeletonRows={6}
          emptyNode={
            <div className="flex flex-col items-center gap-2">
              <svg width="64" height="64" viewBox="0 0 80 80" fill="none" className="opacity-25">
                <rect x="8" y="28" width="64" height="44" rx="4" fill="#94a3b8" />
                <rect x="8" y="20" width="30" height="12" rx="3" fill="#64748b" />
                <rect x="20" y="12" width="18" height="20" rx="2" fill="#cbd5e1" />
                <rect x="42" y="8" width="18" height="24" rx="2" fill="#cbd5e1" />
              </svg>
              <p className="text-sm font-medium text-red-400">No data available in table</p>
              <p className="text-xs text-gray-400">Add a new record or try different search criteria.</p>
            </div>
          }
          wrapperClassName="flex-1 overflow-auto"
          searchValue={search}
          onSearchChange={v => setSearch(v)}
          toolbarRight={
            <Select value={String(pageSize)} onValueChange={v => { setPageSize(Number(v)); setPage(1); loadVisits(activeTab, search, 1, Number(v)) }}>
              <SelectTrigger className="h-8 w-20 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['25', '50', '100'].map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          }
          downloadable
          printable
          fileName="opd-visits"
        />

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-3 py-1.5 border-t border-gray-200 shrink-0 bg-gray-50">
          <span className="text-xs text-gray-500">Records: {from} to {to} of {total}</span>
          <div className="flex items-center gap-1">
            <button
              className="p-0.5 rounded hover:bg-gray-200 text-gray-500 disabled:opacity-30"
              disabled={page <= 1}
              onClick={() => { const p = page - 1; setPage(p); loadVisits(activeTab, search, p, pageSize) }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              className="p-0.5 rounded hover:bg-gray-200 text-gray-500 disabled:opacity-30"
              disabled={page >= totalPages}
              onClick={() => { const p = page + 1; setPage(p); loadVisits(activeTab, search, p, pageSize) }}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
