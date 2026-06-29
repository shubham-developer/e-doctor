'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { X, Plus, Trash2, Printer, Loader2 } from 'lucide-react'
import { printPrescription } from './PrescriptionPrinter'

// ── Static options ─────────────────────────────────────────────────────────

const DOSE_OPTIONS = ['1/4 Tablet', '1/2 Tablet', '1 Tablet', '2 Tablets', '5 ml', '10 ml', '15 ml', '1 Teaspoon', '2 Teaspoon', '1 Capsule', '2 Capsules']
const INTERVAL_OPTIONS = ['Once Daily', 'Twice Daily', 'Three Times Daily', 'Four Times Daily', 'Every 4 Hours', 'Every 6 Hours', 'Every 8 Hours', 'SOS (as needed)', 'At Bedtime']
const DURATION_OPTIONS = ['1 Day', '2 Days', '3 Days', '5 Days', '7 Days', '10 Days', '14 Days', '21 Days', '1 Month', '2 Months', '3 Months', 'Ongoing']
const NOTIFICATION_ROLES = ['Admin', 'Accountant', 'Doctor', 'Pharmacist', 'Pathologist', 'Radiologist', 'Super Admin', 'Receptionist', 'Nurse']

// ── Types ─────────────────────────────────────────────────────────────────

interface MedicineLine {
  category: string; name: string; dose: string
  doseInterval: string; doseDuration: string; instruction: string
}

interface Finding {
  category: string; list: string; description: string; print: boolean
}

export interface OpdVisitForPrescription {
  _id: string
  opdNumber: number
  visitDate: string
  caseNumber?: string
  patientId: {
    _id: string; name: string; age: number; patientCode?: number
    gender?: string; address?: string; bloodGroup?: string; allergies?: string
    ageMonths?: number; ageDays?: number
  } | null
  doctorId: { name: string; specialization: string } | null
}

// ── Simple rich-text toolbar ──────────────────────────────────────────────

function RichText({ placeholder }: { placeholder?: string }) {
  const ref = useRef<HTMLDivElement>(null)

  function exec(cmd: string, val?: string) {
    ref.current?.focus()
    document.execCommand(cmd, false, val ?? undefined)
  }

  const btnCls = 'px-2 py-0.5 text-xs rounded hover:bg-gray-200 transition-colors'

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center gap-0.5 px-2 py-1 bg-gray-50 border-b border-gray-200 flex-wrap">
        <span className="text-xs text-gray-400 mr-1">A</span>
        <button type="button" onMouseDown={e => { e.preventDefault(); exec('bold') }}         className={`${btnCls} font-bold`}>Bold</button>
        <button type="button" onMouseDown={e => { e.preventDefault(); exec('italic') }}       className={`${btnCls} italic`}>Italic</button>
        <button type="button" onMouseDown={e => { e.preventDefault(); exec('underline') }}    className={`${btnCls} underline`}>Underline</button>
        <button type="button" onMouseDown={e => { e.preventDefault(); exec('fontSize', '1') }} className={`${btnCls}`}>Small</button>
        <span className="w-px h-4 bg-gray-300 mx-1" />
        <button type="button" onMouseDown={e => { e.preventDefault(); exec('formatBlock', 'blockquote') }} className={btnCls}>❝</button>
        <button type="button" onMouseDown={e => { e.preventDefault(); exec('insertUnorderedList') }}       className={btnCls}>≡</button>
        <button type="button" onMouseDown={e => { e.preventDefault(); exec('insertOrderedList') }}         className={btnCls}>⊞</button>
        <button type="button" onMouseDown={e => { e.preventDefault(); exec('indent') }}                    className={btnCls}>⇥</button>
        <button type="button" onMouseDown={e => { e.preventDefault(); exec('outdent') }}                   className={btnCls}>⇤</button>
        <button type="button" onMouseDown={e => { e.preventDefault(); exec('removeFormat') }}              className={btnCls}>↺</button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        className="min-h-16 p-2.5 text-sm focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-gray-300"
      />
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────

export function PrescriptionForm({
  visit, onClose, clinicName, clinicAddress, clinicPhone,
}: {
  visit: OpdVisitForPrescription
  onClose: () => void
  clinicName: string
  clinicAddress?: string
  clinicPhone?: string
}) {
  const headerRef = useRef<HTMLDivElement>(null)
  const footerRef = useRef<HTMLDivElement>(null)

  const [finding, setFinding] = useState<Finding>({ category: '', list: '', description: '', print: true })
  const [medicines, setMedicines] = useState<MedicineLine[]>([
    { category: '', name: '', dose: '', doseInterval: '', doseDuration: '', instruction: '' },
  ])
  const [pathology, setPathology]   = useState('')
  const [radiology, setRadiology]   = useState('')
  const [submitting, setSubmitting] = useState(false)

  function addMedicine() {
    setMedicines(p => [...p, { category: '', name: '', dose: '', doseInterval: '', doseDuration: '', instruction: '' }])
  }
  function removeMedicine(i: number) {
    setMedicines(p => p.filter((_, idx) => idx !== i))
  }
  function updateMed(i: number, field: keyof MedicineLine, v: string) {
    setMedicines(p => p.map((m, idx) => idx === i ? { ...m, [field]: v } : m))
  }

  async function handleSubmit(print = false) {
    setSubmitting(true)
    try {
      const headerNote = headerRef.current?.innerHTML ?? ''
      const footerNote = footerRef.current?.innerHTML ?? ''
      const filledMeds = medicines.filter(m => m.name.trim())
      const filledFind = (finding.category || finding.description) ? [finding] : []

      const res = await fetch('/api/dashboard/prescription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opdVisitId: visit._id,
          patientId: visit.patientId?._id,
          headerNote,
          footerNote,
          findings: filledFind,
          medicines: filledMeds,
          pathology: pathology.trim() || undefined,
          radiology: radiology.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!data.success) { toast.error(data.error); return }

      toast.success('Prescription saved')

      if (print) {
        printPrescription({
          opdNumber: visit.opdNumber,
          caseNumber: visit.caseNumber,
          visitDate: visit.visitDate,
          patientName: visit.patientId?.name ?? '',
          patientCode: visit.patientId?.patientCode,
          patientAge: visit.patientId?.age ?? 0,
          patientAgeMonths: visit.patientId?.ageMonths,
          patientAgeDays: visit.patientId?.ageDays,
          patientGender: visit.patientId?.gender,
          patientAddress: visit.patientId?.address,
          patientBloodGroup: visit.patientId?.bloodGroup,
          patientAllergies: visit.patientId?.allergies,
          doctorName: visit.doctorId?.name,
          headerNote,
          footerNote,
          medicines: filledMeds,
          findings: filledFind,
          clinicName,
          clinicAddress,
          clinicPhone,
        })
      }

      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  const thCls = 'text-xs font-semibold text-gray-600 pb-1'
  const sel   = 'h-9 text-sm w-full'

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col overflow-hidden">

      {/* ── Top bar ── */}
      <div className="h-10 bg-blue-600 flex items-center px-4 shrink-0">
        <span className="text-white font-semibold text-sm">Add Prescription</span>
        <button onClick={onClose} className="ml-auto text-white/80 hover:text-white"><X className="w-5 h-5" /></button>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 min-h-0">

        {/* Main */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Header Note */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Header Note</p>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="flex items-center gap-0.5 px-2 py-1 bg-gray-50 border-b border-gray-200 flex-wrap">
                <span className="text-xs text-gray-400 mr-1">A</span>
                {[
                  ['Bold', 'bold', 'font-bold'], ['Italic', 'italic', 'italic'],
                  ['Underline', 'underline', 'underline'], ['Small', 'fontSize:1', ''],
                ].map(([label, cmd, cls]) => (
                  <button key={label} type="button" onMouseDown={e => { e.preventDefault(); const [c, v] = cmd.split(':'); headerRef.current?.focus(); document.execCommand(c, false, v ?? undefined) }}
                    className={`px-2 py-0.5 text-xs rounded hover:bg-gray-200 ${cls}`}>{label}</button>
                ))}
                <span className="w-px h-4 bg-gray-300 mx-1" />
                {[['❝', 'formatBlock:blockquote'], ['≡', 'insertUnorderedList'], ['⊞', 'insertOrderedList'], ['⇥', 'indent'], ['⇤', 'outdent'], ['↺', 'removeFormat']].map(([icon, cmd]) => (
                  <button key={icon} type="button" onMouseDown={e => { e.preventDefault(); const [c, v] = cmd.split(':'); headerRef.current?.focus(); document.execCommand(c, false, v ?? undefined) }}
                    className="px-1.5 py-0.5 text-xs rounded hover:bg-gray-200">{icon}</button>
                ))}
              </div>
              <div ref={headerRef} contentEditable suppressContentEditableWarning className="min-h-14 p-2.5 text-sm focus:outline-none" />
            </div>
          </div>

          {/* Findings */}
          <div className="rounded-lg border border-gray-200 p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Findings</p>
            <div className="grid grid-cols-12 gap-3 items-start">
              <div className="col-span-3">
                <p className={thCls}>Finding Category</p>
                <Input className="h-9 text-sm" value={finding.category} onChange={e => setFinding(p => ({ ...p, category: e.target.value }))} placeholder="Category" />
              </div>
              <div className="col-span-3">
                <p className={thCls}>Finding List</p>
                <Input className="h-9 text-sm" value={finding.list} onChange={e => setFinding(p => ({ ...p, list: e.target.value }))} />
              </div>
              <div className="col-span-5">
                <p className={thCls}>Finding Description</p>
                <textarea className="w-full h-20 text-sm border border-gray-200 rounded-md px-2.5 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  value={finding.description} onChange={e => setFinding(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="col-span-1 pt-6 flex items-center gap-1.5">
                <Checkbox checked={finding.print} onCheckedChange={v => setFinding(p => ({ ...p, print: Boolean(v) }))} />
                <span className="text-xs text-gray-500">Print</span>
              </div>
            </div>
          </div>

          {/* Medicines */}
          <div className="rounded-lg border border-gray-200 p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Medicines</p>
            <div className="grid grid-cols-12 gap-2 mb-1">
              {['Medicine Category', 'Medicine', 'Dose', 'Dose Interval', 'Dose Duration', 'Instruction'].map((h, i) => (
                <p key={h} className={`${thCls} ${i === 0 ? 'col-span-2' : i === 1 ? 'col-span-2' : 'col-span-2'}`}>{h}</p>
              ))}
            </div>
            {medicines.map((m, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-2">
                  <Input className="h-9 text-sm" placeholder="Category" value={m.category} onChange={e => updateMed(i, 'category', e.target.value)} />
                </div>
                <div className="col-span-2">
                  <Input className="h-9 text-sm" placeholder="Medicine name" value={m.name} onChange={e => updateMed(i, 'name', e.target.value)} />
                </div>
                <div className="col-span-2">
                  <Select value={m.dose} onValueChange={v => updateMed(i, 'dose', v ?? '')}>
                    <SelectTrigger className={sel}><SelectValue>{m.dose || 'Select'}</SelectValue></SelectTrigger>
                    <SelectContent>{DOSE_OPTIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Select value={m.doseInterval} onValueChange={v => updateMed(i, 'doseInterval', v ?? '')}>
                    <SelectTrigger className={sel}><SelectValue>{m.doseInterval || 'Select'}</SelectValue></SelectTrigger>
                    <SelectContent>{INTERVAL_OPTIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Select value={m.doseDuration} onValueChange={v => updateMed(i, 'doseDuration', v ?? '')}>
                    <SelectTrigger className={sel}><SelectValue>{m.doseDuration || 'Select'}</SelectValue></SelectTrigger>
                    <SelectContent>{DURATION_OPTIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-1">
                  <Input className="h-9 text-sm" placeholder="Instruction" value={m.instruction} onChange={e => updateMed(i, 'instruction', e.target.value)} />
                </div>
                <div className="col-span-1 flex justify-center">
                  <button type="button" onClick={() => removeMedicine(i)} className="text-red-400 hover:text-red-600 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            <Button size="sm" type="button" onClick={addMedicine} className="h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 mt-1">
              <Plus className="w-3.5 h-3.5" /> Add Medicine
            </Button>
          </div>

          {/* Attachment */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Attachment</p>
            <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-lg p-4 text-sm text-gray-400 cursor-pointer hover:border-gray-300 hover:text-gray-500 transition-colors">
              ☁ Drop a file here or click
              <input type="file" className="hidden" multiple />
            </label>
          </div>

          {/* Footer Note */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Footer Note</p>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="flex items-center gap-0.5 px-2 py-1 bg-gray-50 border-b border-gray-200 flex-wrap">
                <span className="text-xs text-gray-400 mr-1">A</span>
                {[['Bold', 'bold', 'font-bold'], ['Italic', 'italic', 'italic'], ['Underline', 'underline', 'underline'], ['Small', 'fontSize:1', '']].map(([label, cmd, cls]) => (
                  <button key={label} type="button" onMouseDown={e => { e.preventDefault(); const [c, v] = cmd.split(':'); footerRef.current?.focus(); document.execCommand(c, false, v ?? undefined) }}
                    className={`px-2 py-0.5 text-xs rounded hover:bg-gray-200 ${cls}`}>{label}</button>
                ))}
                <span className="w-px h-4 bg-gray-300 mx-1" />
                {[['❝', 'formatBlock:blockquote'], ['≡', 'insertUnorderedList'], ['⊞', 'insertOrderedList'], ['↺', 'removeFormat']].map(([icon, cmd]) => (
                  <button key={icon} type="button" onMouseDown={e => { e.preventDefault(); const [c, v] = cmd.split(':'); footerRef.current?.focus(); document.execCommand(c, false, v ?? undefined) }}
                    className="px-1.5 py-0.5 text-xs rounded hover:bg-gray-200">{icon}</button>
                ))}
              </div>
              <div ref={footerRef} contentEditable suppressContentEditableWarning className="min-h-14 p-2.5 text-sm focus:outline-none" />
            </div>
          </div>
        </div>

        {/* ── Right sidebar ── */}
        <div className="w-64 shrink-0 border-l border-gray-200 p-4 space-y-5 overflow-y-auto bg-gray-50">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Pathology</p>
            <Input className="h-9 text-sm" placeholder="Select" value={pathology} onChange={e => setPathology(e.target.value)} />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Radiology</p>
            <Input className="h-9 text-sm" placeholder="Select" value={radiology} onChange={e => setRadiology(e.target.value)} />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Notification To</p>
            <div className="space-y-2">
              {NOTIFICATION_ROLES.map(role => (
                <label key={role} className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer select-none">
                  <Checkbox /> {role}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer bar ── */}
      <div className="h-14 bg-white border-t border-gray-200 flex items-center justify-end gap-3 px-5 shrink-0">
        <Button className="h-10 px-5 text-sm gap-2 bg-blue-600 hover:bg-blue-700" disabled={submitting} onClick={() => handleSubmit(true)}>
          <Printer className="w-4 h-4" /> {submitting ? 'Saving…' : 'Save & Print'}
        </Button>
        <Button className="h-10 px-6 text-sm bg-green-600 hover:bg-green-700" disabled={submitting} onClick={() => handleSubmit(false)}>
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
        </Button>
      </div>
    </div>
  )
}
