'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useApp } from '@/lib/context'
import { ArrowLeft, BedDouble, User, Phone, MapPin, Droplet, Calendar, FileText, Stethoscope, LogOut, Send, Trash2, Clock, Pencil, X, ChevronDown, Plus, IndianRupee, CreditCard, CheckCircle2, Printer } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/format'
import { apiClient } from '@/lib/apiClient'
import { useCurrency } from '@/lib/context'
import { toast } from 'sonner'
import { printIpdBill } from '@/components/ipd/IpdBillPrinter'
import { printDischargeSummary, DischargeSummaryData } from '@/components/ipd/DischargeSummaryPrinter'
import type { ChargeLookup } from '@/lib/types/charges'


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
  bedHistory: BedHistoryEntry[]
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
  { key: 'lab-investigation',   label: 'Lab Investigation' },
  { key: 'charges',             label: 'Charges' },
  { key: 'payments',            label: 'Payments' },
  { key: 'bed-history',         label: 'Bed History' },
  { key: 'discharge-summary',   label: 'Discharge Summary' },
]


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

// ── Nurse Notes tab ───────────────────────────────────────────────────────────

interface NurseNote {
  _id: string
  note: string
  addedByName: string
  addedByRole: string
  createdAt: string
}

function NurseNotesTab({ patientId }: { patientId: string }) {
  const { user } = useApp()
  const [notes,   setNotes]   = useState<NurseNote[]>([])
  const [loading, setLoading] = useState(true)
  const [text,    setText]    = useState('')
  const [saving,  setSaving]  = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetch(`/api/dashboard/nurse-notes?patientId=${patientId}&limit=100`)
      .then(r => r.json())
      .then(d => { if (d.success) setNotes(d.data) })
      .finally(() => setLoading(false))
  }, [patientId])

  async function handleSave() {
    if (!text.trim()) return
    setSaving(true)
    try {
      const res  = await fetch('/api/dashboard/nurse-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, note: text.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        setNotes(prev => [data.data, ...prev])
        setText('')
        textareaRef.current?.focus()
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this note?')) return
    const res  = await fetch(`/api/dashboard/nurse-notes/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.success) setNotes(prev => prev.filter(n => n._id !== id))
  }

  const canWrite = user?.role !== 'VIEWER'

  return (
    <div className="p-4 max-w-2xl mx-auto flex flex-col gap-4">
      {/* Input area */}
      {canWrite && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Add Note</p>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSave() }}
            placeholder="Type a clinical observation, instruction, or follow-up note…"
            rows={3}
            className="w-full text-sm border border-gray-200 rounded-lg p-3 resize-none outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
          />
          <div className="flex items-center justify-between mt-2">
            <p className="text-[10px] text-gray-400">Ctrl+Enter to save</p>
            <button
              onClick={handleSave}
              disabled={saving || !text.trim()}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition"
            >
              <Send className="w-3 h-3" />
              {saving ? 'Saving…' : 'Save Note'}
            </button>
          </div>
        </div>
      )}

      {/* Notes history */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          History {!loading && `(${notes.length})`}
        </p>
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse">
                <div className="h-3 bg-gray-100 rounded w-32 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-full mb-1" />
                <div className="h-3 bg-gray-100 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : notes.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl py-12 text-center text-gray-400">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No notes yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notes.map(n => (
              <div key={n._id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="text-xs font-semibold text-gray-800">{n.addedByName}</span>
                    <span className="ml-2 text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{n.addedByRole}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="flex items-center gap-1 text-[10px] text-gray-400">
                      <Clock className="w-3 h-3" />
                      {new Date(n.createdAt).toLocaleString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit', hour12: true,
                      })}
                    </span>
                    {canWrite && (
                      <button onClick={() => handleDelete(n._id)}
                        className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{n.note}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Bed History tab ───────────────────────────────────────────────────────────

interface BedHistoryEntry {
  bedGroup?: string
  bedNumber?: string
  fromDate: string
  toDate?: string
  isActive: boolean
}

function BedHistoryTab({ history }: { history: BedHistoryEntry[] }) {
  if (!history || history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
        <BedDouble className="w-10 h-10 opacity-20" />
        <p className="text-sm">No bed history recorded</p>
        <p className="text-xs text-gray-300">Bed history is tracked when a bed is assigned or changed</p>
      </div>
    )
  }

  return (
    <div className="p-4">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">Bed Group</th>
            <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">Bed</th>
            <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">From Date</th>
            <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">To Date</th>
            <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">Active Bed</th>
          </tr>
        </thead>
        <tbody>
          {history.map((entry, i) => (
            <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="px-4 py-3 text-gray-700">{entry.bedGroup || '—'}</td>
              <td className="px-4 py-3 font-medium text-gray-800">{entry.bedNumber || '—'}</td>
              <td className="px-4 py-3 text-gray-500">
                {entry.fromDate ? new Date(entry.fromDate).toLocaleString('en-IN', {
                  day: '2-digit', month: '2-digit', year: 'numeric',
                  hour: '2-digit', minute: '2-digit', hour12: true,
                }) : '—'}
              </td>
              <td className="px-4 py-3 text-gray-500">
                {entry.toDate ? new Date(entry.toDate).toLocaleString('en-IN', {
                  day: '2-digit', month: '2-digit', year: 'numeric',
                  hour: '2-digit', minute: '2-digit', hour12: true,
                }) : '—'}
              </td>
              <td className="px-4 py-3">
                {entry.isActive
                  ? <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-700">Yes</span>
                  : <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-500">No</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Medication tab ────────────────────────────────────────────────────────────

interface MedicineOption { _id: string; name: string; salePrice: number; availableQty: number; unit?: string; company?: string }
interface IpdMedication  { _id: string; medicineName: string; quantity: number; unitPrice: number; total: number; date: string; note?: string; addedByName?: string }

function MedicationTab({ ipdId }: { ipdId: string }) {
  const { fmt } = useCurrency()
  const [medications, setMedications] = useState<IpdMedication[]>([])
  const [results,     setResults]     = useState<MedicineOption[]>([])
  const [searchInput, setSearchInput] = useState('')
  const [selected,    setSelected]    = useState<MedicineOption | null>(null)
  const [qty,         setQty]         = useState('1')
  const [unitPrice,   setUnitPrice]   = useState('')
  const [medDate,     setMedDate]     = useState('')
  const [note,        setNote]        = useState('')
  const [saving,      setSaving]      = useState(false)
  const [showForm,    setShowForm]    = useState(false)
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function loadMedications() {
    const d = await apiClient.get<IpdMedication[]>(`/api/dashboard/ipd/${ipdId}/medications`)
    if (d.success) setMedications(d.data)
  }

  useEffect(() => { loadMedications() }, [ipdId])

  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current)
    if (!searchInput.trim()) { setResults([]); return }
    searchRef.current = setTimeout(async () => {
      const d = await apiClient.get<{ medicines: MedicineOption[] }>(`/api/dashboard/pharmacy/medicines?search=${encodeURIComponent(searchInput)}&limit=20`)
      if (d.success) setResults(d.data.medicines)
    }, 300)
  }, [searchInput])

  function pickMedicine(m: MedicineOption) {
    setSelected(m)
    setSearchInput(m.name)
    setUnitPrice(String(m.salePrice))
    setResults([])
  }

  function resetForm() {
    setSelected(null); setSearchInput(''); setUnitPrice(''); setQty('1'); setNote(''); setMedDate(''); setResults([])
  }

  async function handleAdd() {
    if (!searchInput.trim() || !unitPrice) return
    setSaving(true)
    try {
      const d = await apiClient.post(`/api/dashboard/ipd/${ipdId}/medications`, {
        medicineId:   selected?._id,
        medicineName: selected?.name ?? searchInput.trim(),
        quantity:     Number(qty),
        unitPrice:    Number(unitPrice),
        note,
        date: medDate,
      })
      if (d.success) { await loadMedications(); setShowForm(false); resetForm() }
    } finally {
      setSaving(false)
    }
  }

  async function deleteMedication(id: string) {
    await apiClient.delete(`/api/dashboard/ipd/${ipdId}/medications/${id}`)
    loadMedications()
  }

  const total = medications.reduce((s, m) => s + m.total, 0)
  const inp   = 'h-8 w-full px-2 text-xs border border-gray-300 rounded focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none bg-white'
  const lbl   = 'block text-[11px] font-semibold text-gray-500 uppercase mb-1'

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-800">Total Medication:</span>
          <span className="text-sm font-bold text-blue-700">{fmt(total)}</span>
          <span className="text-xs text-gray-400">(added to Charges automatically)</span>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(v => !v) }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add Medicine
        </button>
      </div>

      {showForm && (
        <div className="border border-blue-200 bg-blue-50/40 rounded-lg p-4 space-y-3">
          <p className="text-xs font-semibold text-blue-700">Add Medicine</p>
          <div className="grid grid-cols-2 gap-3">
            {/* Medicine search */}
            <div className="col-span-2 relative">
              <label className={lbl}>Medicine Name <span className="text-red-500">*</span></label>
              <input
                value={searchInput}
                onChange={e => { setSearchInput(e.target.value); setSelected(null) }}
                className={inp}
                placeholder="Search medicine..."
                autoComplete="off"
              />
              {results.length > 0 && (
                <div className="absolute z-20 top-full left-0 right-0 mt-0.5 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {results.map(m => (
                    <button
                      key={m._id}
                      type="button"
                      onClick={() => pickMedicine(m)}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors"
                    >
                      <p className="text-xs font-medium text-gray-800">{m.name}</p>
                      <p className="text-[11px] text-gray-400">
                        {m.company ? `${m.company} · ` : ''}{m.unit ?? ''} · Stock: {m.availableQty} · ₹{m.salePrice}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className={lbl}>Quantity</label>
              <input type="number" min={1} value={qty} onChange={e => setQty(e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Unit Price <span className="text-red-500">*</span></label>
              <input type="number" min={0} value={unitPrice} onChange={e => setUnitPrice(e.target.value)} className={inp} placeholder="0.00" />
            </div>
            <div>
              <label className={lbl}>Date</label>
              <input type="date" value={medDate} onChange={e => setMedDate(e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Note</label>
              <input value={note} onChange={e => setNote(e.target.value)} className={inp} placeholder="Optional..." />
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-gray-500">
              Total: <span className="font-semibold text-gray-900">{fmt((Number(qty) || 0) * (Number(unitPrice) || 0))}</span>
            </span>
            <div className="flex gap-2">
              <button onClick={() => { setShowForm(false); resetForm() }}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
              <button onClick={handleAdd} disabled={saving || !searchInput.trim() || !unitPrice}
                className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 font-medium">
                {saving ? 'Adding…' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {medications.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
          <FileText className="w-10 h-10 opacity-20" />
          <p className="text-sm">No medications added yet</p>
          <p className="text-xs">Added medicines are automatically billed in Charges</p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">Date</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">Medicine</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">Qty</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">Unit Price</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">Total</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">By</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {medications.map(m => (
                <tr key={m._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-500">{m.date}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-800">{m.medicineName}</p>
                    {m.note && <p className="text-xs text-gray-400">{m.note}</p>}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-700">{m.quantity}</td>
                  <td className="px-4 py-3 text-right text-sm text-gray-700">{fmt(m.unitPrice)}</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">{fmt(m.total)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{m.addedByName || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => deleteMedication(m._id)}
                      className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t border-gray-200">
              <tr>
                <td colSpan={4} className="px-4 py-2.5 text-xs font-semibold text-gray-600 text-right uppercase tracking-wide">Grand Total</td>
                <td className="px-4 py-2.5 text-right text-sm font-bold text-blue-700">{fmt(total)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Charges tab ───────────────────────────────────────────────────────────────

interface IpdCharge      { _id: string; categoryName: string; quantity: number; unitPrice: number; total: number; date: string; note?: string; addedByName?: string }

function ChargesTab({ ipdId, admission }: { ipdId: string; admission: IpdDetail }) {
  const { sym, fmt } = useCurrency()
  const { tenant }   = useApp()
  const [charges,    setCharges]    = useState<IpdCharge[]>([])
  const [categories, setCategories] = useState<ChargeLookup[]>([])
  const [showForm,   setShowForm]   = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [editItem,   setEditItem]   = useState<IpdCharge | null>(null)

  // form state
  const [catName,   setCatName]   = useState('')
  const [qty,       setQty]       = useState('1')
  const [unitPrice, setUnitPrice] = useState('')
  const [chargeDate,setChargeDate]= useState('')
  const [note,      setNote]      = useState('')

  function resetForm() { setCatName(''); setQty('1'); setUnitPrice(''); setChargeDate(''); setNote(''); setEditItem(null) }

  async function loadCharges() {
    const d = await apiClient.get<IpdCharge[]>(`/api/dashboard/ipd/${ipdId}/charges`)
    if (d.success) setCharges(d.data)
  }

  useEffect(() => {
    loadCharges()
    apiClient.get<ChargeLookup[]>('/api/dashboard/charges').then(d => {
      if (d.success) setCategories(d.data.filter(c => c.isActive))
    })
  }, [ipdId])

  function onCatChange(name: string) {
    setCatName(name)
    const cat = categories.find(c => c.name === name)
    if (cat) setUnitPrice(String(cat.standardCharge))
  }

  async function handleSave() {
    if (!catName) { return }
    setSaving(true)
    try {
      if (editItem) {
        const d = await apiClient.patch(`/api/dashboard/ipd/${ipdId}/charges/${editItem._id}`, {
          categoryName: catName, quantity: Number(qty), unitPrice: Number(unitPrice), note, date: chargeDate,
        })
        if (d.success) { await loadCharges(); setShowForm(false); resetForm() }
      } else {
        const d = await apiClient.post(`/api/dashboard/ipd/${ipdId}/charges`, {
          categoryName: catName, quantity: Number(qty), unitPrice: Number(unitPrice), note, date: chargeDate,
        })
        if (d.success) { await loadCharges(); setShowForm(false); resetForm() }
      }
    } finally {
      setSaving(false)
    }
  }

  function startEdit(c: IpdCharge) {
    setEditItem(c); setCatName(c.categoryName); setQty(String(c.quantity))
    setUnitPrice(String(c.unitPrice)); setNote(c.note ?? ''); setChargeDate(c.date)
    setShowForm(true)
  }

  async function deleteCharge(id: string) {
    await apiClient.delete(`/api/dashboard/ipd/${ipdId}/charges/${id}`)
    loadCharges()
  }

  const total = charges.reduce((s, c) => s + c.total, 0)
  const inp   = 'h-8 w-full px-2 text-xs border border-gray-300 rounded focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none bg-white'
  const lbl   = 'block text-[11px] font-semibold text-gray-500 uppercase mb-1'

  function billData(totalPaid: number, balance: number, payment: { amount: number; paymentMode: string; note?: string; date: string; addedByName?: string }) {
    const p = admission.patientId
    return {
      ipdNumber:      admission.ipdNumber,
      admissionDate:  admission.admissionDate,
      dischargeDate:  admission.dischargeDate,
      caseNumber:     admission.caseNumber,
      bedNumber:      admission.bedNumber,
      bedGroup:       admission.bedGroup,
      patientName:    p?.name ?? '—',
      patientCode:    p?.patientCode,
      patientAge:     p?.age,
      patientAgeMonths: p?.ageMonths,
      patientAgeDays:   p?.ageDays,
      patientGender:  p?.gender,
      patientPhone:   p?.phone,
      patientBloodGroup: p?.bloodGroup,
      doctorName:     admission.doctorId?.name,
      doctorSpecialization: admission.doctorId?.specialization,
      charges,
      totalCharges:   total,
      payment,
      totalPaid,
      balance,
      currency:       tenant?.currency,
      currencySymbol: tenant?.currencySymbol ?? '₹',
      clinicName:     tenant?.name ?? 'Hospital',
      clinicAddress:  tenant?.address,
      logoUrl:        tenant?.logoUrl,
    }
  }

  return (
    <div className="p-4 space-y-4">
      {/* Summary + Add button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IndianRupee className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-semibold text-gray-800">Total Charges:</span>
          <span className="text-sm font-bold text-blue-700">{fmt(total)}</span>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(v => !v) }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add Charge
        </button>
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <div className="border border-blue-200 bg-blue-50/40 rounded-lg p-4 space-y-3">
          <p className="text-xs font-semibold text-blue-700">{editItem ? 'Edit Charge' : 'New Charge'}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className={lbl}>Charge Category <span className="text-red-500">*</span></label>
              <select value={catName} onChange={e => onCatChange(e.target.value)} className={inp}>
                <option value="">Select category</option>
                {categories.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Date</label>
              <input type="date" value={chargeDate} onChange={e => setChargeDate(e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Quantity</label>
              <input type="number" value={qty} min={1} onChange={e => setQty(e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Unit Price</label>
              <input type="number" value={unitPrice} min={0} onChange={e => setUnitPrice(e.target.value)} className={inp} placeholder="0.00" />
            </div>
            <div className="col-span-2">
              <label className={lbl}>Note (optional)</label>
              <input value={note} onChange={e => setNote(e.target.value)} className={inp} placeholder="Note..." />
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-gray-500">
              Total: <span className="font-semibold text-gray-900">{fmt((Number(qty) || 0) * (Number(unitPrice) || 0))}</span>
            </span>
            <div className="flex gap-2">
              <button onClick={() => { setShowForm(false); resetForm() }}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} disabled={saving || !catName}
                className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 font-medium">
                {saving ? 'Saving…' : editItem ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Charges table */}
      {charges.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
          <IndianRupee className="w-10 h-10 opacity-20" />
          <p className="text-sm">No charges added yet</p>
          <p className="text-xs">Click "Add Charge" to add a billable item</p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">Date</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">Category</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">Qty</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">Unit Price</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">Total</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {charges.map(c => (
                <tr key={c._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-500">{c.date}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-800">{c.categoryName}</p>
                    {c.note && <p className="text-xs text-gray-400">{c.note}</p>}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-700">{c.quantity}</td>
                  <td className="px-4 py-3 text-right text-sm text-gray-700">{fmt(c.unitPrice)}</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">{fmt(c.total)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => startEdit(c)}
                        className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteCharge(c._id)}
                        className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t border-gray-200">
              <tr>
                <td colSpan={4} className="px-4 py-2.5 text-xs font-semibold text-gray-600 text-right uppercase tracking-wide">Grand Total</td>
                <td className="px-4 py-2.5 text-right text-sm font-bold text-blue-700">{fmt(total)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Payments tab ──────────────────────────────────────────────────────────────

interface IpdPayment { _id: string; amount: number; paymentMode: string; note?: string; date: string; addedByName?: string }

const PAYMENT_MODES = ['Cash', 'Card', 'UPI', 'Insurance', 'Cheque', 'Bank Transfer', 'Other']

function PaymentsTab({ ipdId, admission }: { ipdId: string; admission: IpdDetail }) {
  const { sym, fmt } = useCurrency()
  const { tenant }   = useApp()
  const [payments,      setPayments]      = useState<IpdPayment[]>([])
  const [charges,       setChargesData]   = useState<IpdCharge[]>([])
  const [totalCharges,  setTotalCharges]  = useState(0)
  const [showForm,      setShowForm]      = useState(false)
  const [editItem,      setEditItem]      = useState<IpdPayment | null>(null)
  const [saving,        setSaving]        = useState(false)

  // form state
  const [amount,      setAmount]      = useState('')
  const [mode,        setMode]        = useState('Cash')
  const [payNote,     setPayNote]     = useState('')
  const [payDate,     setPayDate]     = useState('')

  function resetForm() { setAmount(''); setMode('Cash'); setPayNote(''); setPayDate(''); setEditItem(null) }

  async function loadAll() {
    const [ch, pmnts] = await Promise.all([
      apiClient.get<IpdCharge[]>(`/api/dashboard/ipd/${ipdId}/charges`),
      apiClient.get<IpdPayment[]>(`/api/dashboard/ipd/${ipdId}/payments`),
    ])
    if (ch.success)    { setChargesData(ch.data); setTotalCharges(ch.data.reduce((s, c) => s + c.total, 0)) }
    if (pmnts.success) setPayments(pmnts.data)
  }

  useEffect(() => { loadAll() }, [ipdId])

  async function handleSave() {
    if (!amount || Number(amount) <= 0) return
    setSaving(true)
    try {
      if (editItem) {
        const d = await apiClient.patch(`/api/dashboard/ipd/${ipdId}/payments/${editItem._id}`, {
          amount: Number(amount), paymentMode: mode, note: payNote, date: payDate,
        })
        if (d.success) { await loadAll(); setShowForm(false); resetForm() }
      } else {
        const d = await apiClient.post(`/api/dashboard/ipd/${ipdId}/payments`, {
          amount: Number(amount), paymentMode: mode, note: payNote, date: payDate,
        })
        if (d.success) { await loadAll(); setShowForm(false); resetForm() }
      }
    } finally {
      setSaving(false)
    }
  }

  function startEdit(p: IpdPayment) {
    setEditItem(p); setAmount(String(p.amount)); setMode(p.paymentMode)
    setPayNote(p.note ?? ''); setPayDate(p.date); setShowForm(true)
  }

  async function deletePayment(id: string) {
    await apiClient.delete(`/api/dashboard/ipd/${ipdId}/payments/${id}`)
    loadAll()
  }

  const totalPaid    = payments.reduce((s, p) => s + p.amount, 0)
  const balance      = totalCharges - totalPaid
  const inp          = 'h-8 w-full px-2 text-xs border border-gray-300 rounded focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none bg-white'
  const lbl          = 'block text-[11px] font-semibold text-gray-500 uppercase mb-1'

  function billBase(paidUpTo: number, payment: IpdPayment) {
    const pt = admission.patientId
    return {
      ipdNumber:      admission.ipdNumber,
      admissionDate:  admission.admissionDate,
      dischargeDate:  admission.dischargeDate,
      caseNumber:     admission.caseNumber,
      bedNumber:      admission.bedNumber,
      bedGroup:       admission.bedGroup,
      patientName:    pt?.name ?? '—',
      patientCode:    pt?.patientCode,
      patientAge:     pt?.age,
      patientAgeMonths: pt?.ageMonths,
      patientAgeDays:   pt?.ageDays,
      patientGender:  pt?.gender,
      patientPhone:   pt?.phone,
      patientBloodGroup: pt?.bloodGroup,
      doctorName:     admission.doctorId?.name,
      doctorSpecialization: admission.doctorId?.specialization,
      charges,
      totalCharges,
      payment: { amount: payment.amount, paymentMode: payment.paymentMode, note: payment.note, date: payment.date, addedByName: payment.addedByName },
      totalPaid: paidUpTo,
      balance: totalCharges - paidUpTo,
      currency:       tenant?.currency,
      currencySymbol: tenant?.currencySymbol ?? '₹',
      clinicName:     tenant?.name ?? 'Hospital',
      clinicAddress:  tenant?.address,
      logoUrl:        tenant?.logoUrl,
    }
  }


  return (
    <div className="p-4 space-y-4">
      {/* Balance summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="border border-gray-200 rounded-lg p-3 bg-white">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Total Charges</p>
          <p className="text-lg font-bold text-gray-900">{fmt(totalCharges)}</p>
        </div>
        <div className="border border-green-200 rounded-lg p-3 bg-green-50">
          <p className="text-[11px] font-semibold text-green-600 uppercase tracking-wide mb-1">Total Paid</p>
          <p className="text-lg font-bold text-green-700">{fmt(totalPaid)}</p>
        </div>
        <div className={`border rounded-lg p-3 ${balance <= 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
          <p className={`text-[11px] font-semibold uppercase tracking-wide mb-1 ${balance <= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {balance <= 0 ? 'Fully Paid' : 'Balance Due'}
          </p>
          <div className="flex items-center gap-1.5">
            {balance <= 0
              ? <CheckCircle2 className="w-4 h-4 text-green-600" />
              : null}
            <p className={`text-lg font-bold ${balance <= 0 ? 'text-green-700' : 'text-red-600'}`}>
              {fmt(Math.abs(balance))}
            </p>
          </div>
        </div>
      </div>

      {/* Add payment button */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">Payment History</p>
        <button
          onClick={() => { resetForm(); setShowForm(v => !v) }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add Payment
        </button>
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <div className="border border-green-200 bg-green-50/40 rounded-lg p-4 space-y-3">
          <p className="text-xs font-semibold text-green-700">{editItem ? 'Edit Payment' : 'New Payment'}</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Amount <span className="text-red-500">*</span></label>
              <input type="number" value={amount} min={0} onChange={e => setAmount(e.target.value)} className={inp} placeholder="0.00" />
            </div>
            <div>
              <label className={lbl}>Date</label>
              <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Payment Mode</label>
              <select value={mode} onChange={e => setMode(e.target.value)} className={inp}>
                {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Note (optional)</label>
              <input value={payNote} onChange={e => setPayNote(e.target.value)} className={inp} placeholder="Note..." />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => { setShowForm(false); resetForm() }}
              className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
            <button onClick={handleSave} disabled={saving || !amount || Number(amount) <= 0}
              className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 font-medium">
              {saving ? 'Saving…' : editItem ? 'Update' : 'Record Payment'}
            </button>
          </div>
        </div>
      )}

      {/* Payments table */}
      {payments.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
          <CreditCard className="w-10 h-10 opacity-20" />
          <p className="text-sm">No payments recorded yet</p>
          <p className="text-xs">Click "Add Payment" to record a payment</p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">Date</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">Mode</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">Note</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">By</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">Amount</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.map((p, idx) => {
                const paidUpTo = payments.slice(0, idx + 1).reduce((s, x) => s + x.amount, 0)
                return (
                <tr key={p._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-500">{p.date}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700">
                      {p.paymentMode}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{p.note || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{p.addedByName || '—'}</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-green-700">{fmt(p.amount)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => printIpdBill(billBase(paidUpTo, p))}
                        title="Print Bill"
                        className="p-1 rounded hover:bg-blue-50 text-blue-600 hover:text-blue-700 transition-colors">
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => startEdit(p)}
                        className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deletePayment(p._id)}
                        className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
                )
              })}
            </tbody>
            <tfoot className="bg-gray-50 border-t border-gray-200">
              <tr>
                <td colSpan={4} className="px-4 py-2.5 text-xs font-semibold text-gray-600 text-right uppercase tracking-wide">Total Paid</td>
                <td className="px-4 py-2.5 text-right text-sm font-bold text-green-700">{fmt(totalPaid)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Lab Investigation tab ─────────────────────────────────────────────────────

interface PathologyTestOption { _id: string; name: string; categoryName?: string; amount: number }
interface IpdLabTest { _id: string; testName: string; categoryName?: string; amount: number; date: string; note?: string; addedByName?: string }

function LabInvestigationTab({ ipdId }: { ipdId: string }) {
  const { fmt } = useCurrency()
  const [labTests,    setLabTests]    = useState<IpdLabTest[]>([])
  const [results,     setResults]     = useState<PathologyTestOption[]>([])
  const [searchInput, setSearchInput] = useState('')
  const [selected,    setSelected]    = useState<PathologyTestOption | null>(null)
  const [amount,      setAmount]      = useState('')
  const [labDate,     setLabDate]     = useState('')
  const [note,        setNote]        = useState('')
  const [saving,      setSaving]      = useState(false)
  const [showForm,    setShowForm]    = useState(false)
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function loadLabTests() {
    const d = await apiClient.get<IpdLabTest[]>(`/api/dashboard/ipd/${ipdId}/lab-tests`)
    if (d.success) setLabTests(d.data)
  }

  useEffect(() => { loadLabTests() }, [ipdId])

  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current)
    if (!searchInput.trim()) { setResults([]); return }
    searchRef.current = setTimeout(async () => {
      const d = await apiClient.get<{ tests: PathologyTestOption[] }>(
        `/api/dashboard/pathology/tests?search=${encodeURIComponent(searchInput)}`
      )
      if (d.success) setResults(d.data.tests)
    }, 300)
  }, [searchInput])

  function pickTest(t: PathologyTestOption) {
    setSelected(t)
    setSearchInput(t.name)
    setAmount(String(t.amount))
    setResults([])
  }

  function resetForm() {
    setSelected(null); setSearchInput(''); setAmount(''); setLabDate(''); setNote(''); setResults([])
  }

  async function handleAdd() {
    if (!searchInput.trim()) return
    setSaving(true)
    try {
      const d = await apiClient.post(`/api/dashboard/ipd/${ipdId}/lab-tests`, {
        testId:       selected?._id,
        testName:     selected?.name ?? searchInput.trim(),
        categoryName: selected?.categoryName,
        amount:       Number(amount) || 0,
        note,
        date: labDate,
      })
      if (d.success) { await loadLabTests(); setShowForm(false); resetForm() }
      else toast.error((d as { error?: string }).error ?? 'Failed to add test')
    } finally {
      setSaving(false)
    }
  }

  async function deleteLabTest(id: string) {
    const d = await apiClient.delete(`/api/dashboard/ipd/${ipdId}/lab-tests/${id}`)
    if (d.success) loadLabTests()
  }

  const total = labTests.reduce((s, t) => s + t.amount, 0)
  const inp   = 'h-8 w-full px-2 text-xs border border-gray-300 rounded focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none bg-white'
  const lbl   = 'block text-[11px] font-semibold text-gray-500 uppercase mb-1'

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-800">Total Lab Charges:</span>
          <span className="text-sm font-bold text-blue-700">{fmt(total)}</span>
          <span className="text-xs text-gray-400">(added to Charges automatically)</span>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(v => !v) }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add Test
        </button>
      </div>

      {showForm && (
        <div className="border border-blue-200 bg-blue-50/40 rounded-lg p-4 space-y-3">
          <p className="text-xs font-semibold text-blue-700">Add Lab Test</p>
          <div className="grid grid-cols-2 gap-3">
            {/* Test search */}
            <div className="col-span-2 relative">
              <label className={lbl}>Test Name <span className="text-red-500">*</span></label>
              <input
                value={searchInput}
                onChange={e => { setSearchInput(e.target.value); setSelected(null) }}
                className={inp}
                placeholder="Search pathology test…"
                autoComplete="off"
              />
              {results.length > 0 && (
                <div className="absolute z-20 top-full left-0 right-0 mt-0.5 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {results.map(t => (
                    <button
                      key={t._id}
                      type="button"
                      onClick={() => pickTest(t)}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors"
                    >
                      <p className="text-xs font-medium text-gray-800">{t.name}</p>
                      <p className="text-[11px] text-gray-400">
                        {t.categoryName ? `${t.categoryName} · ` : ''}&#8377;{t.amount}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className={lbl}>Amount <span className="text-red-500">*</span></label>
              <input type="number" min={0} value={amount} onChange={e => setAmount(e.target.value)} className={inp} placeholder="0.00" />
            </div>
            <div>
              <label className={lbl}>Date</label>
              <input type="date" value={labDate} onChange={e => setLabDate(e.target.value)} className={inp} />
            </div>
            <div className="col-span-2">
              <label className={lbl}>Note (optional)</label>
              <input value={note} onChange={e => setNote(e.target.value)} className={inp} placeholder="Optional note…" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => { setShowForm(false); resetForm() }}
              className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
            <button onClick={handleAdd} disabled={saving || !searchInput.trim()}
              className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 font-medium">
              {saving ? 'Adding…' : 'Add'}
            </button>
          </div>
        </div>
      )}

      {labTests.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
          <FileText className="w-10 h-10 opacity-20" />
          <p className="text-sm">No lab tests added yet</p>
          <p className="text-xs">Added tests are automatically billed in Charges</p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">Date</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">Test</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">Category</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">Amount</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">By</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {labTests.map(t => (
                <tr key={t._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-500">{t.date || '—'}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-800">{t.testName}</p>
                    {t.note && <p className="text-xs text-gray-400">{t.note}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{t.categoryName || '—'}</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">{fmt(t.amount)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{t.addedByName || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => deleteLabTest(t._id)}
                      className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t border-gray-200">
              <tr>
                <td colSpan={3} className="px-4 py-2.5 text-xs font-semibold text-gray-600 text-right uppercase tracking-wide">Grand Total</td>
                <td className="px-4 py-2.5 text-right text-sm font-bold text-blue-700">{fmt(total)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Discharge Summary tab ─────────────────────────────────────────────────────

interface DischargeSummaryFields {
  diagnosis:              string
  historyOfPresentIllness:string
  examinationFindings:    string
  investigations:         string
  treatmentGiven:         string
  proceduresPerformed:    string
  conditionAtDischarge:   string
  followUpInstructions:   string
  medicationsAtDischarge: string
  additionalNotes:        string
  writtenByName?:         string
}

const EMPTY_SUMMARY: DischargeSummaryFields = {
  diagnosis: '', historyOfPresentIllness: '', examinationFindings: '',
  investigations: '', treatmentGiven: '', proceduresPerformed: '',
  conditionAtDischarge: '', followUpInstructions: '',
  medicationsAtDischarge: '', additionalNotes: '',
}

function DischargeSummaryTab({ ipdId, admission }: { ipdId: string; admission: IpdDetail }) {
  const { tenant, user } = useApp()
  const [fields,  setFields]  = useState<DischargeSummaryFields>(EMPTY_SUMMARY)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)

  useEffect(() => {
    apiClient.get<Partial<DischargeSummaryFields> | null>(`/api/dashboard/ipd/${ipdId}/discharge-summary`)
      .then(d => {
        if (d.success && d.data) setFields(prev => ({ ...prev, ...d.data }))
      })
      .finally(() => setLoading(false))
  }, [ipdId])

  function setField(key: keyof DischargeSummaryFields, value: string) {
    setFields(prev => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const d = await apiClient.post<Partial<DischargeSummaryFields>>(`/api/dashboard/ipd/${ipdId}/discharge-summary`, fields)
      if (d.success) {
        toast.success('Discharge summary saved')
        if (d.data) setFields(prev => ({ ...prev, ...d.data }))
      } else {
        toast.error(d.error ?? 'Failed to save')
      }
    } finally {
      setSaving(false)
    }
  }

  function handlePrint() {
    const p = admission.patientId
    const data: DischargeSummaryData = {
      ipdNumber:    admission.ipdNumber,
      admissionDate: admission.admissionDate,
      dischargeDate: admission.dischargeDate,
      caseNumber:   admission.caseNumber,
      bedNumber:    admission.bedNumber,
      bedGroup:     admission.bedGroup,
      patientName:  p?.name ?? '—',
      patientCode:  p?.patientCode,
      patientAge:   p?.age,
      patientAgeMonths: p?.ageMonths,
      patientAgeDays:   p?.ageDays,
      patientGender:  p?.gender,
      patientPhone:   p?.phone,
      patientBloodGroup: p?.bloodGroup,
      doctorName:   admission.doctorId?.name,
      doctorSpecialization: admission.doctorId?.specialization,
      ...fields,
      writtenByName: fields.writtenByName ?? user?.name,
      clinicName:   tenant?.name ?? 'Hospital',
      clinicAddress: tenant?.address,
      logoUrl:      tenant?.logoUrl,
    }
    printDischargeSummary(data)
  }

  const lbl = 'block text-[11px] font-semibold text-gray-500 uppercase mb-1'
  const ta  = 'w-full px-3 py-2 text-sm border border-gray-300 rounded resize-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 outline-none'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400">
        <p className="text-sm">Loading…</p>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-800">Discharge Summary</p>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors"
          >
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-4 bg-white border border-gray-200 rounded-lg p-5">
        <div>
          <label className={lbl}>Diagnosis <span className="text-red-500">*</span></label>
          <textarea rows={3} value={fields.diagnosis} onChange={e => setField('diagnosis', e.target.value)} className={ta} placeholder="Primary and secondary diagnoses…" />
        </div>
        <div>
          <label className={lbl}>History of Present Illness</label>
          <textarea rows={3} value={fields.historyOfPresentIllness} onChange={e => setField('historyOfPresentIllness', e.target.value)} className={ta} placeholder="Brief history…" />
        </div>
        <div>
          <label className={lbl}>Examination Findings</label>
          <textarea rows={3} value={fields.examinationFindings} onChange={e => setField('examinationFindings', e.target.value)} className={ta} placeholder="Clinical examination on admission…" />
        </div>
        <div>
          <label className={lbl}>Investigations</label>
          <textarea rows={3} value={fields.investigations} onChange={e => setField('investigations', e.target.value)} className={ta} placeholder="Lab reports, imaging, etc…" />
        </div>
        <div>
          <label className={lbl}>Treatment Given</label>
          <textarea rows={3} value={fields.treatmentGiven} onChange={e => setField('treatmentGiven', e.target.value)} className={ta} placeholder="Medical treatment administered…" />
        </div>
        <div>
          <label className={lbl}>Procedures Performed</label>
          <textarea rows={2} value={fields.proceduresPerformed} onChange={e => setField('proceduresPerformed', e.target.value)} className={ta} placeholder="Surgeries, procedures, etc…" />
        </div>
        <div>
          <label className={lbl}>Condition at Discharge</label>
          <textarea rows={2} value={fields.conditionAtDischarge} onChange={e => setField('conditionAtDischarge', e.target.value)} className={ta} placeholder="Patient's condition at the time of discharge…" />
        </div>
        <div>
          <label className={lbl}>Medications at Discharge</label>
          <textarea rows={3} value={fields.medicationsAtDischarge} onChange={e => setField('medicationsAtDischarge', e.target.value)} className={ta} placeholder="Medications prescribed at discharge…" />
        </div>
        <div>
          <label className={lbl}>Follow-up Instructions</label>
          <textarea rows={3} value={fields.followUpInstructions} onChange={e => setField('followUpInstructions', e.target.value)} className={ta} placeholder="Diet, activity restrictions, follow-up date…" />
        </div>
        <div>
          <label className={lbl}>Additional Notes</label>
          <textarea rows={2} value={fields.additionalNotes} onChange={e => setField('additionalNotes', e.target.value)} className={ta} placeholder="Any other remarks…" />
        </div>
        <div>
          <label className={lbl}>Written by</label>
          <input
            value={fields.writtenByName ?? ''}
            onChange={e => setField('writtenByName', e.target.value)}
            className="w-full h-8 px-3 text-sm border border-gray-300 rounded focus:border-blue-400 focus:ring-1 focus:ring-blue-200 outline-none"
            placeholder="Doctor name for signature…"
          />
        </div>
      </div>

      {/* Bottom save + print */}
      <div className="flex justify-end gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors"
        >
          {saving ? 'Saving…' : 'Save Summary'}
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors"
        >
          <Printer className="w-3.5 h-3.5" /> Print Summary
        </button>
      </div>
    </div>
  )
}

// ── Edit Dialog ───────────────────────────────────────────────────────────────

interface BedGroupOption { _id: string; name: string }
interface BedOption      { _id: string; name: string; status: string }
interface DoctorOption   { _id: string; name: string; specialization: string }

function EditDialog({
  admission,
  onClose,
  onSaved,
}: {
  admission: IpdDetail
  onClose: () => void
  onSaved: (updated: IpdDetail) => void
}) {
  // Form state
  const [symptomsType,         setSymptomsType]         = useState(admission.symptomsType         ?? '')
  const [symptomsTitle,        setSymptomsTitle]        = useState(admission.symptomsTitle        ?? '')
  const [symptomsDesc,         setSymptomsDesc]         = useState(admission.chiefComplaint        ?? '')
  const [note,                 setNote]                 = useState(admission.note                 ?? '')
  const [previousMedicalIssue, setPreviousMedicalIssue] = useState(admission.previousMedicalIssue ?? '')
  const [admissionDate,        setAdmissionDate]        = useState(admission.admissionDate        ?? '')
  const [caseNumber,           setCaseNumber]           = useState(admission.caseNumber           ?? '')
  const [tpa,                  setTpa]                  = useState(admission.tpa                  ?? '')
  const [casualty,             setCasualty]             = useState(admission.casualty    ? 'Yes' : 'No')
  const [isOldPatient,         setIsOldPatient]         = useState(admission.isOldPatient ? 'Yes' : 'No')
  const [creditLimit,          setCreditLimit]          = useState(String(admission.creditLimit ?? 20000))
  const [reference,            setReference]            = useState(admission.reference   ?? '')
  const [doctorId,             setDoctorId]             = useState('')
  const [bedGroup,             setBedGroup]             = useState(admission.bedGroup    ?? '')
  const [bedNumber,            setBedNumber]            = useState(admission.bedNumber   ?? '')
  const [liveConsultation,     setLiveConsultation]     = useState(admission.liveConsultation ? 'Yes' : 'No')

  // API data
  const [doctors,    setDoctors]    = useState<DoctorOption[]>([])
  const [bedGroups,  setBedGroups]  = useState<BedGroupOption[]>([])
  const [beds,       setBeds]       = useState<BedOption[]>([])
  const [saving,     setSaving]     = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/dashboard/doctors').then(r => r.json()),
      fetch('/api/dashboard/bed-groups').then(r => r.json()),
    ]).then(([d, g]) => {
      if (d.success) setDoctors(d.data)
      if (g.success) setBedGroups(g.data.items ?? [])
    })
  }, [])

  useEffect(() => {
    if (!bedGroup) { setBeds([]); return }
    fetch(`/api/dashboard/beds?bedGroup=${encodeURIComponent(bedGroup)}`)
      .then(r => r.json())
      .then(d => { if (d.success) setBeds(d.data.beds ?? []) })
  }, [bedGroup])

  async function handleSave() {
    setSaving(true)
    try {
      const res  = await fetch(`/api/dashboard/ipd/${admission._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symptomsType,
          symptomsTitle,
          chiefComplaint:       symptomsDesc,
          note,
          previousMedicalIssue,
          admissionDate,
          caseNumber,
          tpa,
          casualty:         casualty         === 'Yes',
          isOldPatient:     isOldPatient     === 'Yes',
          liveConsultation: liveConsultation === 'Yes',
          creditLimit:      Number(creditLimit) || 20000,
          reference,
          doctorId:  doctorId  || undefined,
          bedGroup:  bedGroup  || undefined,
          bedNumber: bedNumber || undefined,
        }),
      })
      const data = await res.json()
      if (data.success) { onSaved(data.data); onClose() }
    } finally {
      setSaving(false)
    }
  }

  const lbl = 'block text-xs font-semibold text-gray-600 mb-1'
  const inp = 'w-full h-9 px-3 text-sm border border-gray-300 rounded focus:border-blue-400 focus:ring-1 focus:ring-blue-200 outline-none bg-white'
  const sel = 'w-full h-9 px-3 text-sm border border-gray-300 rounded focus:border-blue-400 focus:ring-1 focus:ring-blue-200 outline-none bg-white appearance-none cursor-pointer'

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-blue-600 text-white shrink-0">
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <User className="w-4 h-4 shrink-0 opacity-70" />
          <span className="text-sm font-medium truncate">
            {admission.patientId?.name ?? 'Patient'} — IPDN{admission.ipdNumber}
          </span>
        </div>
        <button onClick={onClose}
          className="p-1.5 rounded hover:bg-blue-700 transition-colors ml-auto">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Two-panel body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Left panel */}
        <div className="flex-1 overflow-y-auto p-6 border-r border-gray-200">
          {/* Symptoms row */}
          <div className="grid grid-cols-3 gap-4 mb-5">
            <div>
              <label className={lbl}>Symptoms Type</label>
              <input value={symptomsType} onChange={e => setSymptomsType(e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Symptoms Title</label>
              <input value={symptomsTitle} onChange={e => setSymptomsTitle(e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Symptoms Description</label>
              <input value={symptomsDesc} onChange={e => setSymptomsDesc(e.target.value)} className={inp} />
            </div>
          </div>

          {/* Note */}
          <div className="mb-5">
            <label className={lbl}>Note</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={4}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded resize-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 outline-none" />
          </div>

          {/* Previous Medical Issue */}
          <div>
            <label className={lbl}>Previous Medical Issue</label>
            <textarea value={previousMedicalIssue} onChange={e => setPreviousMedicalIssue(e.target.value)} rows={4}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded resize-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 outline-none" />
          </div>
        </div>

        {/* Right sidebar */}
        <div className="w-80 shrink-0 overflow-y-auto p-5 flex flex-col gap-4">
          {/* Admission Date */}
          <div>
            <label className={lbl}>Admission Date <span className="text-red-500">*</span></label>
            <input type="date" value={admissionDate} onChange={e => setAdmissionDate(e.target.value)} className={inp} />
          </div>

          {/* Case + TPA */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Case</label>
              <input value={caseNumber} onChange={e => setCaseNumber(e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>TPA</label>
              <input value={tpa} onChange={e => setTpa(e.target.value)} className={inp} />
            </div>
          </div>

          {/* Casualty + Old Patient */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Casualty</label>
              <div className="relative">
                <select value={casualty} onChange={e => setCasualty(e.target.value)} className={sel}>
                  <option>No</option>
                  <option>Yes</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className={lbl}>Old Patient</label>
              <div className="relative">
                <select value={isOldPatient} onChange={e => setIsOldPatient(e.target.value)} className={sel}>
                  <option>No</option>
                  <option>Yes</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Reference */}
          <div>
            <label className={lbl}>Reference</label>
            <input value={reference} onChange={e => setReference(e.target.value)} className={inp} />
          </div>

          {/* Consultant Doctor */}
          <div>
            <label className={lbl}>Consultant Doctor <span className="text-red-500">*</span></label>
            <div className="relative">
              <select value={doctorId} onChange={e => setDoctorId(e.target.value)} className={sel}>
                <option value="">Select</option>
                {doctors.map(d => (
                  <option key={d._id} value={d._id}>{d.name} — {d.specialization}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Bed Group */}
          <div>
            <label className={lbl}>Bed Group</label>
            <div className="relative">
              <select value={bedGroup} onChange={e => { setBedGroup(e.target.value); setBedNumber('') }} className={sel}>
                <option value="">Select</option>
                {bedGroups.map(g => (
                  <option key={g._id} value={g.name}>{g.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Bed Number */}
          <div>
            <label className={lbl}>Bed Number <span className="text-red-500">*</span></label>
            <div className="relative">
              <select value={bedNumber} onChange={e => setBedNumber(e.target.value)} className={sel} disabled={!bedGroup}>
                <option value="">Select</option>
                {beds.map(b => (
                  <option key={b._id} value={b.name}
                    disabled={b.status === 'allotted' && b.name !== admission.bedNumber}>
                    {b.name} {b.status === 'allotted' && b.name !== admission.bedNumber ? '(Occupied)' : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Live Consultation */}
          <div>
            <label className={lbl}>Live Consultation</label>
            <div className="relative">
              <select value={liveConsultation} onChange={e => setLiveConsultation(e.target.value)} className={sel}>
                <option>No</option>
                <option>Yes</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Save */}
          <button onClick={handleSave} disabled={saving}
            className="mt-auto w-full h-10 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded transition-colors">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Overview tab ──────────────────────────────────────────────────────────────

function OverviewTab({ admission }: { admission: IpdDetail }) {
  const { tenant } = useApp()
  const sym = tenant?.currencySymbol ?? '₹'
  const p = admission.patientId

  const ageStr = p ? [
    p.age       ? `${p.age} Year`       : null,
    p.ageMonths ? `${p.ageMonths} Month` : null,
    p.ageDays   ? `${p.ageDays} Day`    : null,
  ].filter(Boolean).join(', ') : '—'

  const bedDisplay = [admission.bedNumber, admission.bedGroup].filter(Boolean).join(' - ') || '—'

  return (
    <div className="flex flex-col gap-4 p-4">
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
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function IpdProfilePage() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()
  const { user } = useApp()
  const [admission, setAdmission]     = useState<IpdDetail | null>(null)
  const [loading, setLoading]         = useState(true)
  const [activeTab, setActiveTab]     = useState('overview')
  const [discharging, setDischarging] = useState(false)
  const [confirmDischarge, setConfirmDischarge] = useState(false)
  const [editOpen, setEditOpen]       = useState(false)
  const canEdit = user?.role !== 'VIEWER'

  async function handleDischarge() {
    setDischarging(true)
    try {
      // Check outstanding balance before allowing discharge
      const [chargesRes, paymentsRes] = await Promise.all([
        apiClient.get<{ total: number }[]>(`/api/dashboard/ipd/${id}/charges`),
        apiClient.get<{ amount: number }[]>(`/api/dashboard/ipd/${id}/payments`),
      ])
      const totalCharges  = chargesRes.success  ? (chargesRes.data  as unknown as { total: number }[]).reduce((s, c) => s + c.total,  0) : 0
      const totalPaid     = paymentsRes.success ? (paymentsRes.data as unknown as { amount: number }[]).reduce((s, p) => s + p.amount, 0) : 0
      const balance       = totalCharges - totalPaid

      if (balance > 0) {
        toast.error(`Cannot discharge — outstanding balance of ₹${balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}. Please clear all dues first.`)
        setConfirmDischarge(false)
        return
      }

      const res  = await fetch(`/api/dashboard/ipd/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'DISCHARGED' }),
      })
      const data = await res.json()
      if (data.success) {
        setAdmission(prev => prev ? { ...prev, status: 'DISCHARGED', dischargeDate: data.data.dischargeDate } : prev)
        setConfirmDischarge(false)
      }
    } finally {
      setDischarging(false)
    }
  }

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
          <div className="ml-auto flex items-center gap-3">
            {canEdit && (
              <button
                onClick={() => setEditOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
            )}
            {admission.status === 'ADMITTED' && (
              !confirmDischarge ? (
                <button
                  onClick={() => setConfirmDischarge(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Discharge
                </button>
              ) : (
                <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-1.5">
                  <span className="text-xs text-orange-700 font-medium">Discharge patient?</span>
                  <button
                    onClick={() => setConfirmDischarge(false)}
                    className="text-xs text-gray-500 hover:text-gray-700 px-2 py-0.5 rounded hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDischarge}
                    disabled={discharging}
                    className="text-xs font-medium text-white bg-orange-500 hover:bg-orange-600 px-2 py-0.5 rounded transition-colors disabled:opacity-60"
                  >
                    {discharging ? 'Discharging…' : 'Yes, Discharge'}
                  </button>
                </div>
              )
            )}
            <span className="text-xs font-mono text-blue-600 font-semibold">
              IPDN{admission.ipdNumber}
            </span>
          </div>
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
        {activeTab === 'nurse-notes'         && <NurseNotesTab patientId={admission.patientId?._id ?? ''} />}
        {activeTab === 'bed-history'         && <BedHistoryTab history={admission.bedHistory ?? []} />}
        {activeTab === 'medication'          && <MedicationTab ipdId={admission._id} />}
        {activeTab === 'lab-investigation'   && <LabInvestigationTab ipdId={admission._id} />}
        {activeTab === 'charges'             && <ChargesTab ipdId={admission._id} admission={admission} />}
        {activeTab === 'payments'            && <PaymentsTab ipdId={admission._id} admission={admission} />}
        {activeTab === 'discharge-summary'   && <DischargeSummaryTab ipdId={admission._id} admission={admission} />}
      </div>

      {editOpen && (
        <EditDialog
          admission={admission}
          onClose={() => setEditOpen(false)}
          onSaved={updated => setAdmission(prev => prev ? { ...prev, ...updated } : prev)}
        />
      )}
    </div>
  )
}
