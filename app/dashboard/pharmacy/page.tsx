'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Plus, Search, X, Pill, ChevronDown, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { SearchableSelect } from '@/components/ui/searchable-select'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Medicine {
  _id: string
  name: string
  category?: string
  availableQty: number
  salePrice: number
  taxPercent: number
  batchNo?: string
  expiryDate?: string
}

interface BillLine {
  medicineId?: string
  medicineName: string
  category: string
  batchNo: string
  expiryDate: string
  quantity: number | ''
  availableQty: number
  salePrice: number | ''
  taxPercent: number | ''
  discountPercent: number | ''
  amount: number
}

interface PatientOption {
  id: string
  name: string
  code?: string
}

interface PharmacyBill {
  _id: string
  billNumber: number
  caseId?: string
  prescriptionNo?: string
  patientId?: { _id: string; name: string; patientCode?: string }
  doctorId?: { _id: string; name: string }
  doctorName?: string
  totalAmount: number
  discountAmount: number
  taxAmount: number
  netAmount: number
  paidAmount: number
  paymentMode: string
  createdBy?: { name: string }
  createdAt: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) { return n.toFixed(2) }

function calcLine(ln: BillLine) {
  return (Number(ln.quantity) || 0) * (Number(ln.salePrice) || 0)
}

function calcSummary(lines: BillLine[]) {
  let total = 0, discount = 0, tax = 0
  for (const ln of lines) {
    const base = calcLine(ln)
    const disc = base * (Number(ln.discountPercent) || 0) / 100
    tax      += (base - disc) * (Number(ln.taxPercent) || 0) / 100
    discount += disc
    total    += base
  }
  return { total, discount, tax, net: total - discount + tax }
}

// ─── Patient Combobox ─────────────────────────────────────────────────────────

function PatientCombobox({ value, onChange }: { value: PatientOption | null; onChange: (p: PatientOption | null) => void }) {
  const [open, setOpen]       = useState(false)
  const [query, setQuery]     = useState('')
  const [options, setOptions] = useState<PatientOption[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef     = useRef<HTMLInputElement>(null)
  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!query.trim()) { setOptions([]); return }
    timerRef.current = setTimeout(async () => {
      const res = await fetch(`/api/dashboard/patients?search=${encodeURIComponent(query)}&limit=20`)
      const data = await res.json()
      if (data.success) {
        setOptions((data.data.patients ?? []).map((p: { _id: string; name: string; patientCode?: string }) => ({
          id: p._id, name: p.name, code: p.patientCode,
        })))
      }
    }, 250)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
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
    <div ref={containerRef} className="relative flex-1 min-w-0">
      <button
        type="button"
        onClick={openDropdown}
        className="w-full h-9 flex items-center justify-between gap-2 bg-white/10 border border-white/30 rounded-lg px-3 text-sm hover:bg-white/20 transition-colors"
      >
        {value ? (
          <span className="font-medium text-white truncate">
            {value.name}
            {value.code ? <span className="ml-1.5 text-blue-200 font-normal text-xs">({value.code})</span> : null}
          </span>
        ) : (
          <span className="text-blue-200">Search patient…</span>
        )}
        <ChevronDown className="w-4 h-4 text-blue-200 shrink-0" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Type patient name…"
                className="w-full h-8 pl-8 pr-3 text-sm text-gray-900 bg-white border border-gray-200 rounded-md outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {query.trim() === '' ? (
              <p className="py-5 text-center text-xs text-gray-400">Type a name to search patients</p>
            ) : options.length === 0 ? (
              <p className="py-5 text-center text-xs text-gray-400">No patients found for &quot;{query}&quot;</p>
            ) : (
              options.map(p => (
                <button key={p.id} type="button"
                  onMouseDown={() => select(p)}
                  className={`w-full text-left px-3 py-2.5 border-b border-gray-50 last:border-0 hover:bg-blue-50 transition-colors ${value?.id === p.id ? 'bg-blue-50' : ''}`}>
                  <span className="text-sm font-medium text-gray-900">{p.name}</span>
                  {p.code && <span className="ml-2 text-xs text-gray-400">({p.code})</span>}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Generate Bill Form ───────────────────────────────────────────────────────

function GenerateBillForm({ billNumber, onClose, onSaved }: {
  billNumber: number
  onClose: () => void
  onSaved: (bill: PharmacyBill) => void
}) {
  const [patient, setPatient]         = useState<PatientOption | null>(null)
  const [prescriptionNo, setPrescriptionNo] = useState('')
  const [applyTpa, setApplyTpa]       = useState(false)
  const [caseId, setCaseId]           = useState('')
  const [doctorName, setDoctorName]   = useState('')
  const [note, setNote]               = useState('')
  const [paymentMode, setPaymentMode] = useState('Cash')
  const [paidAmount, setPaidAmount]   = useState<number | ''>('')
  const [lines, setLines]             = useState<BillLine[]>([defaultLine()])
  const [medicines, setMedicines]     = useState<Medicine[]>([])
  const [categories, setCategories]   = useState<string[]>([])
  const [doctors, setDoctors]         = useState<{ _id: string; name: string }[]>([])
  const [saving, setSaving]           = useState(false)

  function defaultLine(): BillLine {
    return { medicineName: '', category: '', batchNo: '', expiryDate: '', quantity: '', availableQty: 0, salePrice: '', taxPercent: '', discountPercent: '', amount: 0 }
  }

  useEffect(() => {
    fetch('/api/dashboard/pharmacy/medicines?limit=200')
      .then(r => r.json()).then(d => { if (d.success) setMedicines(d.data.medicines ?? []) })
    fetch('/api/dashboard/pharmacy/masters?type=category')
      .then(r => r.json()).then(d => { if (d.success) setCategories(d.data.map((c: { name: string }) => c.name)) })
    fetch('/api/dashboard/doctors')
      .then(r => r.json()).then(d => { if (d.success) setDoctors(d.data) })
  }, [])

  function updateLine(idx: number, patch: Partial<BillLine>) {
    setLines(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], ...patch }
      next[idx].amount = calcLine(next[idx])
      return next
    })
  }

  function selectCategory(idx: number, cat: string) {
    updateLine(idx, { category: cat, medicineName: '', medicineId: undefined, batchNo: '', expiryDate: '', availableQty: 0, salePrice: '', taxPercent: '' })
  }

  function selectMedicine(idx: number, medId: string) {
    const med = medicines.find(m => m._id === medId)
    if (!med) return
    updateLine(idx, { medicineId: med._id, medicineName: med.name, batchNo: med.batchNo ?? '', expiryDate: med.expiryDate ?? '', availableQty: med.availableQty, salePrice: med.salePrice, taxPercent: med.taxPercent })
  }

  const summary = calcSummary(lines)

  async function handleSave() {
    if (lines.some(l => !l.medicineName))                   { toast.error('Fill medicine name for all rows'); return }
    if (lines.some(l => !l.quantity || Number(l.quantity) <= 0)) { toast.error('Enter valid quantity for all rows'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/dashboard/pharmacy/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patient?.id, caseId, prescriptionNo, applyTpa, doctorName, note, paymentMode,
          paidAmount: Number(paidAmount) || 0,
          lines: lines.map(l => ({
            medicineId: l.medicineId, medicineName: l.medicineName, category: l.category,
            batchNo: l.batchNo, expiryDate: l.expiryDate,
            quantity: Number(l.quantity) || 0, salePrice: Number(l.salePrice) || 0,
            taxPercent: Number(l.taxPercent) || 0, discountPercent: Number(l.discountPercent) || 0, amount: l.amount,
          })),
          totalAmount: summary.total, discountAmount: summary.discount, taxAmount: summary.tax, netAmount: summary.net,
        }),
      })
      const data = await res.json()
      if (!data.success) { toast.error(data.error); return }
      toast.success(`Bill #${data.data.billNumber} created`)
      onSaved(data.data.bill)
      onClose()
    } finally { setSaving(false) }
  }

  const medicinesInCat = (cat: string) => medicines.filter(m => !cat || m.category === cat)
  const now = format(new Date(), 'MM/dd/yyyy hh:mm a')

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Blue top bar */}
      <div className="bg-blue-600 text-white flex items-center gap-2 px-3 h-12 shrink-0">
        <PatientCombobox value={patient} onChange={setPatient} />
        <button type="button" onClick={() => toast.info('New patient flow coming soon')}
          className="shrink-0 border border-white text-white text-xs px-3 h-8 rounded hover:bg-blue-700 flex items-center gap-1">
          <Plus className="w-3 h-3" /> New Patient
        </button>
        <div className="relative shrink-0" style={{ width: 240 }}>
          <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={prescriptionNo} onChange={e => setPrescriptionNo(e.target.value)}
            placeholder="Prescription No"
            className="w-full pl-7 pr-2 h-8 text-sm text-gray-800 bg-white border border-gray-300 rounded outline-none" />
        </div>
        <label className="flex items-center gap-1.5 text-sm shrink-0">
          <input type="checkbox" checked={applyTpa} onChange={e => setApplyTpa(e.target.checked)} className="w-4 h-4" />
          Apply TPA
        </label>
        <button type="button" onClick={onClose} className="ml-auto text-white hover:text-gray-200">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Bill info bar */}
      <div className="bg-gray-50 border-b px-4 py-2 flex items-center gap-8 text-sm shrink-0">
        <span><span className="font-medium">Bill No</span>&nbsp;{billNumber}</span>
        <div className="flex items-center gap-2">
          <span className="font-medium">Case ID</span>
          <input value={caseId} onChange={e => setCaseId(e.target.value)}
            className="border border-gray-300 rounded px-2 h-8 text-sm w-28" />
        </div>
        <span className="ml-auto text-gray-500">Date {now}</span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pt-3">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                {['Medicine Category *', 'Medicine Name *', 'Batch No', 'Expiry Date', 'Quantity *', 'Available Qty', 'Sale Price ($) *', 'Tax', 'Discount (%)', 'Amount ($)', ''].map(h => (
                  <th key={h} className="text-left py-2 pr-2 font-medium text-gray-600 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map((ln, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-1.5 pr-2">
                    <SearchableSelect
                      value={ln.category}
                      onValueChange={v => selectCategory(i, v)}
                      options={categories.map(c => ({ value: c, label: c }))}
                      placeholder="Category"
                      clearable={false}
                    />
                  </td>
                  <td className="py-1.5 pr-2">
                    <SearchableSelect
                      value={ln.medicineId ?? ''}
                      onValueChange={v => selectMedicine(i, v)}
                      options={medicinesInCat(ln.category).map(m => ({ value: m._id, label: m.name }))}
                      placeholder="Medicine"
                      clearable={false}
                    />
                  </td>
                  <td className="py-1.5 pr-2">
                    <input value={ln.batchNo} onChange={e => updateLine(i, { batchNo: e.target.value })}
                      className="border border-gray-300 rounded px-2 h-10 text-sm w-24" />
                  </td>
                  <td className="py-1.5 pr-2">
                    <input value={ln.expiryDate} onChange={e => updateLine(i, { expiryDate: e.target.value })}
                      className="border border-gray-300 rounded px-2 h-10 text-sm w-24" />
                  </td>
                  <td className="py-1.5 pr-2">
                    <input type="number" min="0" value={ln.quantity}
                      onChange={e => updateLine(i, { quantity: e.target.value === '' ? '' : Number(e.target.value) })}
                      className="border border-gray-300 rounded px-2 h-10 text-sm w-16" />
                  </td>
                  <td className="py-1.5 pr-2 text-gray-500 text-center">{ln.availableQty}</td>
                  <td className="py-1.5 pr-2">
                    <input type="number" min="0" value={ln.salePrice}
                      onChange={e => updateLine(i, { salePrice: e.target.value === '' ? '' : Number(e.target.value) })}
                      className="border border-gray-300 rounded px-2 h-10 text-sm w-20" />
                  </td>
                  <td className="py-1.5 pr-2">
                    <div className="flex items-center gap-0.5">
                      <input type="number" min="0" value={ln.taxPercent}
                        onChange={e => updateLine(i, { taxPercent: e.target.value === '' ? '' : Number(e.target.value) })}
                        className="border border-gray-300 rounded px-2 h-10 text-sm w-14" />
                      <span className="text-gray-400">%</span>
                    </div>
                  </td>
                  <td className="py-1.5 pr-2">
                    <div className="flex items-center gap-0.5">
                      <input type="number" min="0" value={ln.discountPercent}
                        onChange={e => updateLine(i, { discountPercent: e.target.value === '' ? '' : Number(e.target.value) })}
                        className="border border-gray-300 rounded px-2 h-10 text-sm w-14" />
                      <span className="text-gray-400">%</span>
                    </div>
                  </td>
                  <td className="py-1.5 pr-2 text-right font-medium">{fmt(ln.amount)}</td>
                  <td className="py-1.5">
                    <button type="button" onClick={() => setLines(prev => prev.filter((_, j) => j !== i))}
                      className="text-red-400 hover:text-red-600">
                      <X className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" onClick={() => setLines(prev => [...prev, defaultLine()])}
            className="mt-2 text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 flex items-center gap-1">
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>

        <div className="px-4 pt-4 pb-6 grid grid-cols-2 gap-6">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Doctor Name</label>
              <SearchableSelect
                value={doctorName}
                onValueChange={setDoctorName}
                options={doctors.map(d => ({ value: d.name, label: d.name }))}
                placeholder="Select doctor"
                emptyText="No doctors found — add in HR"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Note</label>
              <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
                className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full resize-none" />
            </div>
          </div>
          <div className="space-y-1.5">
            {[
              { label: 'Total ($)', value: fmt(summary.total) },
              { label: 'Discount ($)', value: fmt(summary.discount), sub: 'Discount Gross' },
              { label: 'Tax ($)', value: fmt(summary.tax) },
              { label: 'Net Amount ($)', value: fmt(summary.net) },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between border-b border-gray-100 py-1">
                <span className="text-sm text-gray-600">{row.label}</span>
                {row.sub && <span className="text-xs text-gray-400 mr-auto ml-4">{row.sub}</span>}
                <span className="text-sm font-medium">{row.value}</span>
              </div>
            ))}
            <div className="flex items-center gap-3 pt-2">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">Payment Mode</label>
                <SearchableSelect
                  value={paymentMode}
                  onValueChange={setPaymentMode}
                  options={['Cash', 'Card', 'UPI', 'Insurance', 'Online'].map(m => ({ value: m, label: m }))}
                  placeholder="Payment mode"
                  clearable={false}
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">Payment Amount ($) *</label>
                <input type="number" min="0" value={paidAmount}
                  onChange={e => setPaidAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="border border-gray-300 rounded px-2 h-10 text-sm w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t px-4 py-3 flex justify-end gap-2 shrink-0">
        <Button variant="outline" size="sm" onClick={handleSave} disabled={saving} className="flex items-center gap-1.5">
          <Printer className="w-4 h-4" /> Save &amp; Print
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </div>
  )
}

// ─── Bills List ───────────────────────────────────────────────────────────────

function patientLabel(b: PharmacyBill) {
  if (!b.patientId) return '—'
  return `${b.patientId.name}${b.patientId.patientCode ? ` (${b.patientId.patientCode})` : ''}`
}

const billColumns: ColumnDef<PharmacyBill>[] = [
  {
    key: 'billNumber', header: 'Bill No', sortable: true,
    sortValue: b => b.billNumber, skeletonWidth: 'w-20',
    csvValue: b => `PHARMAB${b.billNumber}`,
    render: b => <span className="text-xs font-medium text-blue-600 whitespace-nowrap">PHARMAB{b.billNumber}</span>,
  },
  {
    key: 'caseId', header: 'Case ID', skeletonWidth: 'w-16',
    csvValue: b => b.caseId ?? '',
    render: b => <span className="text-xs text-gray-600">{b.caseId ?? '—'}</span>,
  },
  {
    key: 'createdAt', header: 'Date', sortable: true,
    sortValue: b => new Date(b.createdAt), skeletonWidth: 'w-32',
    csvValue: b => format(new Date(b.createdAt), 'MM/dd/yyyy hh:mm a'),
    render: b => <span className="text-xs whitespace-nowrap text-gray-600">{format(new Date(b.createdAt), 'MM/dd/yyyy hh:mm a')}</span>,
  },
  {
    key: 'patient', header: 'Patient Name', sortable: true,
    sortValue: b => b.patientId?.name ?? '', skeletonWidth: 'w-28',
    csvValue: patientLabel,
    render: b => <span className="text-xs text-gray-800">{patientLabel(b)}</span>,
  },
  {
    key: 'generatedBy', header: 'Generated By', skeletonWidth: 'w-24',
    csvValue: b => b.createdBy?.name ?? '',
    render: b => <span className="text-xs text-gray-600">{b.createdBy?.name ?? '—'}</span>,
  },
  {
    key: 'doctorName', header: 'Doctor Name', skeletonWidth: 'w-24',
    csvValue: b => b.doctorId?.name ?? b.doctorName ?? '',
    render: b => <span className="text-xs text-gray-600">{b.doctorId?.name ?? b.doctorName ?? '—'}</span>,
  },
  {
    key: 'totalAmount', header: 'Amount ($)', align: 'right', sortable: true,
    sortValue: b => b.totalAmount, skeletonWidth: 'w-16',
    csvValue: b => fmt(b.totalAmount),
    render: b => <span className="text-xs text-gray-700">{fmt(b.totalAmount)}</span>,
  },
  {
    key: 'discountAmount', header: 'Discount ($)', align: 'right', skeletonWidth: 'w-20',
    csvValue: b => fmt(b.discountAmount),
    render: b => <span className="text-xs text-gray-700">{`${fmt(b.discountAmount)} (${b.totalAmount > 0 ? fmt(b.discountAmount / b.totalAmount * 100) : '0.00'}%)`}</span>,
  },
  {
    key: 'taxAmount', header: 'Tax ($)', align: 'right', skeletonWidth: 'w-16',
    csvValue: b => fmt(b.taxAmount),
    render: b => <span className="text-xs text-gray-700">{`${fmt(b.taxAmount)} (${b.totalAmount > 0 ? fmt(b.taxAmount / b.totalAmount * 100) : '0.00'}%)`}</span>,
  },
  {
    key: 'netAmount', header: 'Net Amount ($)', align: 'right', sortable: true,
    sortValue: b => b.netAmount, skeletonWidth: 'w-20',
    csvValue: b => fmt(b.netAmount),
    render: b => <span className="text-xs font-medium text-gray-800">{fmt(b.netAmount)}</span>,
  },
  {
    key: 'paidAmount', header: 'Paid ($)', align: 'right', skeletonWidth: 'w-16',
    csvValue: b => fmt(b.paidAmount),
    render: b => <span className="text-xs text-gray-700">{fmt(b.paidAmount)}</span>,
  },
  {
    key: 'balance', header: 'Balance ($)', align: 'right', skeletonWidth: 'w-16',
    csvValue: b => fmt(Math.max(0, b.netAmount - b.paidAmount)),
    render: b => {
      const bal = b.netAmount - b.paidAmount
      return <span className={`text-xs font-medium ${bal > 0 ? 'text-red-600' : 'text-gray-700'}`}>{fmt(Math.max(0, bal))}</span>
    },
  },
]

function BillsList({ onGenerateBill }: { onGenerateBill: () => void }) {
  const [bills, setBills]           = useState<PharmacyBill[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [page, setPage]             = useState(1)
  const [total, setTotal]           = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const limit = 100

  const fetchBills = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/dashboard/pharmacy/bills?search=${encodeURIComponent(search)}&page=${page}&limit=${limit}`)
      const data = await res.json()
      if (data.success) {
        setBills(data.data.bills ?? [])
        setTotal(data.data.total ?? 0)
        setTotalPages(data.data.totalPages ?? 1)
      }
    } finally { setLoading(false) }
  }, [search, page])

  useEffect(() => { fetchBills() }, [fetchBills])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b">
        <h1 className="text-lg font-semibold text-gray-800">Pharmacy Bill</h1>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" onClick={onGenerateBill} className="bg-blue-600 hover:bg-blue-700 flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Generate Bill
          </Button>
          <Link href="/dashboard/pharmacy/medicines">
            <Button variant="outline" size="sm" className="flex items-center gap-1.5">
              <Pill className="w-4 h-4" /> Medicines
            </Button>
          </Link>
        </div>
      </div>

      <DataTable<PharmacyBill>
        columns={billColumns}
        data={bills}
        rowKey={b => b._id}
        loading={loading}
        skeletonRows={8}
        emptyText="No bills found"
        wrapperClassName="flex-1 mx-4 my-3 overflow-auto"
        searchValue={search}
        onSearchChange={v => { setSearch(v); setPage(1) }}
        toolbarRight={<span className="text-xs text-gray-400">{total} records</span>}
        downloadable
        printable
        fileName="pharmacy-bills"
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 p-3 border-t text-sm">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border rounded disabled:opacity-40">Prev</button>
          <span>Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 border rounded disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PharmacyPage() {
  const [showGenerateBill, setShowGenerateBill] = useState(false)
  const [nextBillNumber, setNextBillNumber]     = useState(1)

  async function openGenerateBill() {
    const res = await fetch('/api/dashboard/pharmacy/bills?limit=1')
    const data = await res.json()
    if (data.success) setNextBillNumber((data.data.total ?? 0) + 1)
    setShowGenerateBill(true)
  }

  return (
    <div className="h-full flex flex-col bg-white">
      <BillsList onGenerateBill={openGenerateBill} />
      {showGenerateBill && (
        <GenerateBillForm
          billNumber={nextBillNumber}
          onClose={() => setShowGenerateBill(false)}
          onSaved={() => setShowGenerateBill(false)}
        />
      )}
    </div>
  )
}
