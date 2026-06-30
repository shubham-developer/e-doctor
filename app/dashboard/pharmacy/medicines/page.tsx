'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Plus, Download, FlaskConical, ChevronLeft, X } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Medicine {
  _id: string
  name: string
  category?: string
  company?: string
  composition?: string
  group?: string
  unit?: string
  minLevel?: number
  reorderLevel: number
  taxPercent: number
  boxPacking?: string
  vatAC?: string
  rackNumber?: string
  note?: string
  availableQty: number
  salePrice: number
  batchNo?: string
  expiryDate?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MED_CATEGORIES = [
  'Capsule', 'Tablet', 'Syrup', 'Injection', 'Ointment', 'Liquid',
  'Cream', 'Gel', 'Powder', 'Drops', 'Lotion', 'Inhaler', 'Patch', 'Suspension',
]
const MED_COMPANIES = [
  'Alkem Laboratories', 'Biocon Limited', 'Cipla', "Dr. Reddy's",
  'Lupin Limited', 'Sun Pharma', 'Abbott India', 'Johnson & Johnson',
  'Pfizer', 'Mankind Pharma', 'Zydus Cadila', 'Torrent Pharma',
]
const MED_GROUPS = [
  'Antibacterials', 'Antiparasitics', 'Antigout agents', 'Antimycobacterials',
  'Antivirals', 'Antifungals', 'Analgesics', 'Antipyretics', 'Antacids',
  'Vitamins & Supplements', 'Cardiac', 'Diabetes', 'Steroids', 'Hormones',
  'Dermatology', 'Respiratory', 'Neurology', 'Gastrointestinal',
]
const MED_UNITS = ['mg', 'mg/mL', 'ml', 'g', 'g/dl', 'IU', 'mcg', '%', 'units', 'tablet', 'capsule']

// ─── Add / Edit Medicine Modal ────────────────────────────────────────────────

function MedicineModal({
  open,
  medicine,
  onClose,
  onSaved,
}: {
  open: boolean
  medicine?: Medicine | null
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = !!medicine

  const [name, setName]                 = useState('')
  const [category, setCategory]         = useState('')
  const [company, setCompany]           = useState('')
  const [composition, setComposition]   = useState('')
  const [group, setGroup]               = useState('')
  const [unit, setUnit]                 = useState('')
  const [minLevel, setMinLevel]         = useState<number | ''>('')
  const [reorderLevel, setReorderLevel] = useState<number | ''>('')
  const [taxPercent, setTaxPercent]     = useState<number | ''>('')
  const [boxPacking, setBoxPacking]     = useState('')
  const [vatAC, setVatAC]               = useState('')
  const [rackNumber, setRackNumber]     = useState('')
  const [note, setNote]                 = useState('')
  const [availableQty, setAvailableQty] = useState<number | ''>('')
  const [saving, setSaving]             = useState(false)

  useEffect(() => {
    if (medicine) {
      setName(medicine.name)
      setCategory(medicine.category ?? '')
      setCompany(medicine.company ?? '')
      setComposition(medicine.composition ?? '')
      setGroup(medicine.group ?? '')
      setUnit(medicine.unit ?? '')
      setMinLevel(medicine.minLevel ?? '')
      setReorderLevel(medicine.reorderLevel ?? '')
      setTaxPercent(medicine.taxPercent ?? '')
      setBoxPacking(medicine.boxPacking ?? '')
      setVatAC(medicine.vatAC ?? '')
      setRackNumber(medicine.rackNumber ?? '')
      setNote(medicine.note ?? '')
      setAvailableQty(medicine.availableQty ?? '')
    } else {
      setName(''); setCategory(''); setCompany(''); setComposition('')
      setGroup(''); setUnit(''); setMinLevel(''); setReorderLevel('')
      setTaxPercent(''); setBoxPacking(''); setVatAC(''); setRackNumber('')
      setNote(''); setAvailableQty('')
    }
  }, [medicine, open])

  async function handleSave() {
    if (!name.trim())       { toast.error('Medicine name is required');     return }
    if (!category.trim())   { toast.error('Medicine category is required'); return }
    if (!unit.trim())       { toast.error('Unit is required');              return }
    if (!boxPacking.trim()) { toast.error('Box/Packing is required');       return }
    setSaving(true)
    try {
      const res = await fetch('/api/dashboard/pharmacy/medicines', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(isEdit && { id: medicine!._id }),
          name: name.trim(), category, company,
          composition: composition.trim(), group, unit,
          minLevel:     Number(minLevel)     || 0,
          reorderLevel: Number(reorderLevel) || 0,
          taxPercent:   Number(taxPercent)   || 0,
          boxPacking: boxPacking.trim(), vatAC: vatAC.trim(),
          rackNumber: rackNumber.trim(), note: note.trim(),
          availableQty: Number(availableQty) || 0,
        }),
      })
      const data = await res.json()
      if (!data.success) { toast.error(data.error); throw new Error(data.error) }
      toast.success(isEdit ? 'Medicine updated' : 'Medicine added')
      onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const inp = 'h-9 text-sm border border-gray-300 rounded px-2.5 w-full focus:outline-none focus:border-blue-400'
  const sel = 'h-9 text-sm border border-gray-300 rounded px-2.5 w-full focus:outline-none focus:border-blue-400 bg-white'
  const lbl = 'block text-xs font-medium text-gray-700 mb-1 whitespace-nowrap'

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent showCloseButton={false} className="sm:max-w-none sm:w-[min(92vw,1100px)] p-0 overflow-hidden gap-0">
        <div className="bg-blue-600 text-white flex items-center justify-between px-5 py-3.5">
          <h2 className="text-base font-semibold">{isEdit ? 'Edit Medicine Details' : 'Add Medicine Details'}</h2>
          <button type="button" onClick={onClose} className="text-white hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className={lbl}>Medicine Name <span className="text-red-500">*</span></label>
              <input value={name} onChange={e => setName(e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Medicine Category <span className="text-red-500">*</span></label>
              <select value={category} onChange={e => setCategory(e.target.value)} className={sel}>
                <option value="">Select</option>
                {MED_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Medicine Company</label>
              <select value={company} onChange={e => setCompany(e.target.value)} className={sel}>
                <option value="">Select</option>
                {MED_COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Medicine Composition</label>
              <input value={composition} onChange={e => setComposition(e.target.value)} className={inp} />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className={lbl}>Medicine Group</label>
              <select value={group} onChange={e => setGroup(e.target.value)} className={sel}>
                <option value="">Select</option>
                {MED_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Unit <span className="text-red-500">*</span></label>
              <select value={unit} onChange={e => setUnit(e.target.value)} className={sel}>
                <option value="">Select</option>
                {MED_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Min Level</label>
              <input type="number" min="0" value={minLevel}
                onChange={e => setMinLevel(e.target.value === '' ? '' : Number(e.target.value))}
                className={inp} />
            </div>
            <div>
              <label className={lbl}>Re-Order Level</label>
              <input type="number" min="0" value={reorderLevel}
                onChange={e => setReorderLevel(e.target.value === '' ? '' : Number(e.target.value))}
                className={inp} />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className={lbl}>Tax</label>
              <div className="relative">
                <input type="number" min="0" value={taxPercent}
                  onChange={e => setTaxPercent(e.target.value === '' ? '' : Number(e.target.value))}
                  className={inp + ' pr-7'} />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
              </div>
            </div>
            <div>
              <label className={lbl}>Box/Packing <span className="text-red-500">*</span></label>
              <input value={boxPacking} onChange={e => setBoxPacking(e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>VAT A/C</label>
              <input value={vatAC} onChange={e => setVatAC(e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Rack Number</label>
              <input value={rackNumber} onChange={e => setRackNumber(e.target.value)} className={inp} />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className={lbl}>Available Qty</label>
              <input type="number" min="0" value={availableQty}
                onChange={e => setAvailableQty(e.target.value === '' ? '' : Number(e.target.value))}
                className={inp} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Note</label>
              <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
                className="border border-gray-300 rounded px-2.5 py-2 text-sm w-full focus:outline-none focus:border-blue-400 resize-none" />
            </div>
            <div>
              <label className={lbl}>Medicine Photo ( JPG | JPEG | PNG )</label>
              <div className="border border-gray-300 rounded flex items-center justify-center gap-2 text-gray-400 text-sm cursor-pointer hover:bg-gray-50 h-22">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                Drop a file here or click
              </div>
            </div>
          </div>
        </div>

        <div className="border-t px-6 py-3 flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 flex items-center gap-1.5">
            {saving ? 'Saving…' : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MedicinesPage() {
  const [medicines, setMedicines]             = useState<Medicine[]>([])
  const [loading, setLoading]                 = useState(true)
  const [search, setSearch]                   = useState('')
  const [page, setPage]                       = useState(1)
  const [total, setTotal]                     = useState(0)
  const [totalPages, setTotalPages]           = useState(1)
  const [showAdd, setShowAdd]                 = useState(false)
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null)
  const limit = 100

  const fetchMeds = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/dashboard/pharmacy/medicines?search=${encodeURIComponent(search)}&page=${page}&limit=${limit}`)
      const data = await res.json()
      if (data.success) {
        setMedicines(data.data.medicines ?? [])
        setTotal(data.data.total ?? 0)
        setTotalPages(data.data.totalPages ?? 1)
      }
    } finally {
      setLoading(false)
    }
  }, [search, page])

  useEffect(() => { fetchMeds() }, [fetchMeds])

  const medColumns: ColumnDef<Medicine>[] = [
    {
      key: 'name', header: 'Medicine Name', sortable: true, sortValue: m => m.name,
      skeletonWidth: 'w-36',
      render: m => <span className="text-xs font-medium whitespace-nowrap">{m.name}</span>,
    },
    { key: 'company',     header: 'Company',     sortable: true, sortValue: m => m.company ?? '',     skeletonWidth: 'w-24', render: m => <span className="text-xs text-gray-600">{m.company     || '—'}</span> },
    { key: 'composition', header: 'Composition',  skeletonWidth: 'w-32', className: 'max-w-xs truncate', render: m => <span className="text-xs text-gray-600">{m.composition || '—'}</span> },
    { key: 'category',    header: 'Category',    sortable: true, sortValue: m => m.category ?? '',    skeletonWidth: 'w-20', render: m => <span className="text-xs text-gray-600">{m.category    || '—'}</span> },
    { key: 'group',       header: 'Group',        skeletonWidth: 'w-16', render: m => <span className="text-xs text-gray-600">{m.group  || '—'}</span> },
    { key: 'unit',        header: 'Unit',         skeletonWidth: 'w-12', render: m => <span className="text-xs text-gray-600">{m.unit   || '—'}</span> },
    {
      key: 'availableQty', header: 'Qty', align: 'right', sortable: true, sortValue: m => m.availableQty,
      skeletonWidth: 'w-12',
      render: m => (
        <span className={`text-xs font-medium ${m.availableQty === 0 ? 'text-red-500' : m.availableQty <= m.reorderLevel ? 'text-orange-500' : 'text-gray-700'}`}>
          {m.availableQty}
          {m.availableQty === 0 && <span className="ml-1">(Out)</span>}
          {m.availableQty > 0 && m.availableQty <= m.reorderLevel && <span className="ml-1">(Low)</span>}
        </span>
      ),
    },
    {
      key: 'actions', header: '', skeletonWidth: 'w-10',
      render: m => (
        <button
          onClick={e => { e.stopPropagation(); setEditingMedicine(m) }}
          className="text-xs text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-400 rounded px-2 py-0.5"
        >
          Edit
        </button>
      ),
    },
  ]

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b">
        <Link href="/dashboard/pharmacy" className="text-gray-400 hover:text-gray-700 flex items-center gap-1 text-sm">
          <ChevronLeft className="w-4 h-4" /> Back
        </Link>
        <h1 className="text-lg font-semibold text-gray-800">Medicines Stock</h1>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => toast.info('Import coming soon')} className="flex items-center gap-1.5">
            <Download className="w-4 h-4" /> Import Medicines
          </Button>
          <Button size="sm" onClick={() => setShowAdd(true)} className="bg-blue-600 hover:bg-blue-700 flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Add Medicine
          </Button>
          <Button variant="outline" size="sm" onClick={() => toast.info('Purchase coming soon')} className="flex items-center gap-1.5">
            <FlaskConical className="w-4 h-4" /> Purchase
          </Button>
        </div>
      </div>

      {/* Table */}
      <DataTable<Medicine>
        columns={medColumns}
        data={medicines}
        rowKey={m => m._id}
        loading={loading}
        emptyText="No medicines found"
        onRowClick={m => setEditingMedicine(m)}
        wrapperClassName="flex-1 mx-4 mb-2 overflow-auto"
        searchValue={search}
        onSearchChange={v => { setSearch(v); setPage(1) }}
        toolbarRight={<span className="text-xs text-gray-400">{total} records</span>}
        downloadable
        printable
        fileName="medicines"
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 p-3 border-t text-sm">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border rounded disabled:opacity-40">Prev</button>
          <span>Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 border rounded disabled:opacity-40">Next</button>
        </div>
      )}

      <MedicineModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSaved={fetchMeds}
      />
      <MedicineModal
        open={!!editingMedicine}
        medicine={editingMedicine}
        onClose={() => setEditingMedicine(null)}
        onSaved={() => { fetchMeds(); setEditingMedicine(null) }}
      />
    </div>
  )
}
