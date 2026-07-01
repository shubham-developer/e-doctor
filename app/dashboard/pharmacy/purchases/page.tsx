'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Plus, X, UploadCloud } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { useApp } from '@/lib/context'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Medicine {
  _id: string
  name: string
  category?: string
  salePrice: number
  taxPercent: number
}

interface Supplier {
  _id: string
  name: string
}

interface PurchaseLine {
  medicineId?: string
  medicineName: string
  category: string
  batchNo: string
  expiryMonth: string
  mrp: number | ''
  batchAmount: number | ''
  salePrice: number | ''
  packingQty: number | ''
  quantity: number | ''
  purchasePrice: number | ''
  taxPercent: number | ''
  amount: number
}

interface PharmacyPurchase {
  _id: string
  purchaseNo: number
  billNo?: string
  purchaseDate: string
  supplierName: string
  totalAmount: number
  discountAmount: number
  taxAmount: number
  netAmount: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) { return n.toFixed(2) }

function calcLine(ln: PurchaseLine) {
  return (Number(ln.quantity) || 0) * (Number(ln.purchasePrice) || 0)
}

function calcSummary(lines: PurchaseLine[], discountPercent: number) {
  let total = 0, tax = 0
  for (const ln of lines) {
    const base = calcLine(ln)
    tax   += base * (Number(ln.taxPercent) || 0) / 100
    total += base
  }
  const discount = total * (Number(discountPercent) || 0) / 100
  return { total, discount, tax, net: total - discount + tax }
}

function defaultLine(): PurchaseLine {
  return { medicineName: '', category: '', batchNo: '', expiryMonth: '', mrp: '', batchAmount: '', salePrice: '', packingQty: '', quantity: '', purchasePrice: '', taxPercent: '', amount: 0 }
}

// ─── Purchase Medicine Form ────────────────────────────────────────────────────

function PurchaseMedicineForm({ onClose, onSaved }: {
  onClose: () => void
  onSaved: () => void
}) {
  const { tenant } = useApp()
  const symbol = tenant?.currencySymbol || '₹'
  const [supplierId, setSupplierId]   = useState('')
  const [billNo, setBillNo]           = useState('')
  const [note, setNote]               = useState('')
  const [discountPercent, setDiscountPercent] = useState<number | ''>('')
  const [paymentMode, setPaymentMode] = useState('')
  const [paymentAmount, setPaymentAmount] = useState<number | ''>('')
  const [paymentNote, setPaymentNote] = useState('')
  const [lines, setLines]             = useState<PurchaseLine[]>([defaultLine()])
  const [suppliers, setSuppliers]     = useState<Supplier[]>([])
  const [medicines, setMedicines]     = useState<Medicine[]>([])
  const [categories, setCategories]   = useState<string[]>([])
  const [saving, setSaving]           = useState(false)

  useEffect(() => {
    fetch('/api/dashboard/pharmacy/suppliers')
      .then(r => r.json()).then(d => { if (d.success) setSuppliers(d.data ?? []) })
    fetch('/api/dashboard/pharmacy/medicines?limit=200')
      .then(r => r.json()).then(d => { if (d.success) setMedicines(d.data.medicines ?? []) })
    fetch('/api/dashboard/pharmacy/masters?type=category')
      .then(r => r.json()).then(d => { if (d.success) setCategories(d.data.map((c: { name: string }) => c.name)) })
  }, [])

  function updateLine(idx: number, patch: Partial<PurchaseLine>) {
    setLines(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], ...patch }
      next[idx].amount = calcLine(next[idx])
      return next
    })
  }

  function selectCategory(idx: number, cat: string) {
    updateLine(idx, { category: cat, medicineName: '', medicineId: undefined, salePrice: '', taxPercent: '' })
  }

  function selectMedicine(idx: number, medId: string) {
    const med = medicines.find(m => m._id === medId)
    if (!med) return
    updateLine(idx, { medicineId: med._id, medicineName: med.name, salePrice: med.salePrice || '', taxPercent: med.taxPercent || '' })
  }

  const medicinesInCat = (cat: string) => medicines.filter(m => !cat || m.category === cat)
  const summary = calcSummary(lines, Number(discountPercent) || 0)
  const now = format(new Date(), 'MM/dd/yyyy hh:mm a')

  async function handleSave() {
    if (!supplierId) { toast.error('Select a supplier'); return }
    if (lines.some(l => !l.medicineName)) { toast.error('Fill medicine name for all rows'); return }
    if (lines.some(l => !l.batchNo || !l.expiryMonth)) { toast.error('Fill batch no and expiry month for all rows'); return }
    if (lines.some(l => !l.quantity || Number(l.quantity) <= 0)) { toast.error('Enter valid quantity for all rows'); return }
    if (lines.some(l => !l.purchasePrice || Number(l.purchasePrice) <= 0)) { toast.error('Enter valid purchase price for all rows'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/dashboard/pharmacy/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId, billNo, note,
          discountPercent: Number(discountPercent) || 0,
          paymentMode, paymentAmount: Number(paymentAmount) || 0, paymentNote,
          lines: lines.map(l => ({
            medicineId: l.medicineId, medicineName: l.medicineName, category: l.category,
            batchNo: l.batchNo, expiryMonth: l.expiryMonth,
            mrp: Number(l.mrp) || 0, batchAmount: Number(l.batchAmount) || 0,
            salePrice: Number(l.salePrice) || 0, packingQty: Number(l.packingQty) || 0,
            quantity: Number(l.quantity) || 0, purchasePrice: Number(l.purchasePrice) || 0,
            taxPercent: Number(l.taxPercent) || 0, amount: l.amount,
          })),
          totalAmount: summary.total, discountAmount: summary.discount, taxAmount: summary.tax, netAmount: summary.net,
        }),
      })
      const data = await res.json()
      if (!data.success) { toast.error(data.error); return }
      toast.success(`Purchase PCHNO${data.data.purchaseNo} created`)
      onSaved()
      onClose()
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Blue top bar */}
      <div className="bg-blue-600 text-white flex items-center gap-2 px-3 h-12 shrink-0">
        <div className="flex-1 min-w-0 max-w-md">
          <SearchableSelect
            value={supplierId}
            onValueChange={setSupplierId}
            options={suppliers.map(s => ({ value: s._id, label: s.name }))}
            placeholder="Select Supplier"
            emptyText="No suppliers found"
          />
        </div>
        <button type="button" onClick={onClose} className="ml-auto text-white hover:text-gray-200">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Bill info bar */}
      <div className="bg-gray-50 border-b px-4 py-2 flex items-center gap-8 text-sm shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-medium">Bill No</span>
          <input value={billNo} onChange={e => setBillNo(e.target.value)}
            className="border border-gray-300 rounded px-2 h-8 text-sm w-32" />
        </div>
        <span className="ml-auto font-medium">Purchase Date&nbsp;<span className="font-normal text-gray-600">{now}</span></span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pt-3">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                {['Medicine Category *', 'Medicine Name *', 'Batch No *', 'Expiry Month *', `MRP (${symbol}) *`, `Batch Amount (${symbol})`, `Sale Price (${symbol}) *`, 'Packing Qty', 'Quantity *', `Purchase Price (${symbol}) *`, 'Tax *', `Amount (${symbol}) *`, ''].map(h => (
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
                    <input type="month" value={ln.expiryMonth} onChange={e => updateLine(i, { expiryMonth: e.target.value })}
                      className="border border-gray-300 rounded px-2 h-10 text-sm w-32" />
                  </td>
                  <td className="py-1.5 pr-2">
                    <input type="number" min="0" value={ln.mrp}
                      onChange={e => updateLine(i, { mrp: e.target.value === '' ? '' : Number(e.target.value) })}
                      className="border border-gray-300 rounded px-2 h-10 text-sm w-20" />
                  </td>
                  <td className="py-1.5 pr-2">
                    <input type="number" min="0" value={ln.batchAmount}
                      onChange={e => updateLine(i, { batchAmount: e.target.value === '' ? '' : Number(e.target.value) })}
                      className="border border-gray-300 rounded px-2 h-10 text-sm w-24" />
                  </td>
                  <td className="py-1.5 pr-2">
                    <input type="number" min="0" value={ln.salePrice}
                      onChange={e => updateLine(i, { salePrice: e.target.value === '' ? '' : Number(e.target.value) })}
                      className="border border-gray-300 rounded px-2 h-10 text-sm w-20" />
                  </td>
                  <td className="py-1.5 pr-2">
                    <input type="number" min="0" value={ln.packingQty}
                      onChange={e => updateLine(i, { packingQty: e.target.value === '' ? '' : Number(e.target.value) })}
                      className="border border-gray-300 rounded px-2 h-10 text-sm w-20" />
                  </td>
                  <td className="py-1.5 pr-2">
                    <input type="number" min="0" value={ln.quantity}
                      onChange={e => updateLine(i, { quantity: e.target.value === '' ? '' : Number(e.target.value) })}
                      className="border border-gray-300 rounded px-2 h-10 text-sm w-16" />
                  </td>
                  <td className="py-1.5 pr-2">
                    <input type="number" min="0" value={ln.purchasePrice}
                      onChange={e => updateLine(i, { purchasePrice: e.target.value === '' ? '' : Number(e.target.value) })}
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
              <label className="block text-xs font-medium text-gray-600 mb-1">Note</label>
              <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
                className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full resize-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Attach Document</label>
              <div className="border border-dashed border-gray-300 rounded flex items-center justify-center gap-2 text-gray-400 text-sm cursor-not-allowed h-20">
                <UploadCloud className="w-5 h-5" />
                Drop a file here or click
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between border-b border-gray-100 py-1">
              <span className="text-sm text-gray-600">Total ({symbol})</span>
              <span className="text-sm font-medium">{fmt(summary.total)}</span>
            </div>
            <div className="flex items-center justify-between border-b border-gray-100 py-1">
              <span className="text-sm text-gray-600">Discount ({symbol})</span>
              <div className="flex items-center gap-1">
                <input type="number" min="0" value={discountPercent}
                  onChange={e => setDiscountPercent(e.target.value === '' ? '' : Number(e.target.value))}
                  className="border border-gray-300 rounded px-2 h-8 text-sm w-16 text-right" />
                <span className="text-xs text-gray-400">%</span>
              </div>
              <span className="text-sm font-medium">{fmt(summary.discount)}</span>
            </div>
            <div className="flex items-center justify-between border-b border-gray-100 py-1">
              <span className="text-sm text-gray-600">Tax ({symbol})</span>
              <span className="text-sm font-medium">{fmt(summary.tax)}</span>
            </div>
            <div className="flex items-center justify-between border-b border-gray-100 py-1">
              <span className="text-sm text-gray-600">Net Amount ({symbol})</span>
              <span className="text-sm font-medium">{fmt(summary.net)}</span>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">Payment Mode</label>
                <SearchableSelect
                  value={paymentMode}
                  onValueChange={setPaymentMode}
                  options={['Cash', 'Card', 'UPI', 'Bank Transfer', 'Cheque'].map(m => ({ value: m, label: m }))}
                  placeholder="Payment mode"
                  clearable={false}
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">Payment Amount ({symbol})</label>
                <input type="number" min="0" value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="border border-gray-300 rounded px-2 h-10 text-sm w-full" />
              </div>
            </div>
            <div className="pt-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Payment Note</label>
              <textarea value={paymentNote} onChange={e => setPaymentNote(e.target.value)} rows={2}
                className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full resize-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t px-4 py-3 flex justify-end gap-2 shrink-0">
        <Button size="sm" onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </div>
  )
}

// ─── Purchase List ──────────────────────────────────────────────────────────

function getPurchaseColumns(symbol: string): ColumnDef<PharmacyPurchase>[] {
  return [
  {
    key: 'purchaseNo', header: 'Pharmacy Purchase No', sortable: true,
    sortValue: p => p.purchaseNo, skeletonWidth: 'w-24',
    csvValue: p => `PCHNO${p.purchaseNo}`,
    render: p => <span className="text-xs font-medium text-blue-600 whitespace-nowrap">PCHNO{p.purchaseNo}</span>,
  },
  {
    key: 'purchaseDate', header: 'Purchase Date', sortable: true,
    sortValue: p => new Date(p.purchaseDate), skeletonWidth: 'w-32',
    csvValue: p => format(new Date(p.purchaseDate), 'MM/dd/yyyy hh:mm a'),
    render: p => <span className="text-xs whitespace-nowrap text-gray-600">{format(new Date(p.purchaseDate), 'MM/dd/yyyy hh:mm a')}</span>,
  },
  {
    key: 'billNo', header: 'Bill No', sortable: true, sortValue: p => p.billNo ?? '', skeletonWidth: 'w-16',
    csvValue: p => p.billNo ?? '',
    render: p => <span className="text-xs text-gray-600">{p.billNo ?? '—'}</span>,
  },
  {
    key: 'supplierName', header: 'Supplier Name', sortable: true, sortValue: p => p.supplierName, skeletonWidth: 'w-28',
    csvValue: p => p.supplierName,
    render: p => <span className="text-xs text-gray-800">{p.supplierName}</span>,
  },
  {
    key: 'totalAmount', header: `Total (${symbol})`, align: 'right', sortable: true,
    sortValue: p => p.totalAmount, skeletonWidth: 'w-16',
    csvValue: p => fmt(p.totalAmount),
    render: p => <span className="text-xs text-gray-700">{fmt(p.totalAmount)}</span>,
  },
  {
    key: 'discountAmount', header: `Discount (${symbol})`, align: 'right', skeletonWidth: 'w-20',
    csvValue: p => fmt(p.discountAmount),
    render: p => <span className="text-xs text-gray-700">{`${fmt(p.discountAmount)} (${p.totalAmount > 0 ? fmt(p.discountAmount / p.totalAmount * 100) : '0.00'}%)`}</span>,
  },
  {
    key: 'taxAmount', header: `Tax (${symbol})`, align: 'right', skeletonWidth: 'w-16',
    csvValue: p => fmt(p.taxAmount),
    render: p => <span className="text-xs text-gray-700">{`${fmt(p.taxAmount)} (${p.totalAmount > 0 ? fmt(p.taxAmount / p.totalAmount * 100) : '0.00'}%)`}</span>,
  },
  {
    key: 'netAmount', header: `Net Amount (${symbol})`, align: 'right', sortable: true,
    sortValue: p => p.netAmount, skeletonWidth: 'w-20',
    csvValue: p => fmt(p.netAmount),
    render: p => <span className="text-xs font-medium text-gray-800">{fmt(p.netAmount)}</span>,
  },
  ]
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PurchasesPage() {
  const { tenant } = useApp()
  const symbol = tenant?.currencySymbol || '₹'
  const [purchases, setPurchases]   = useState<PharmacyPurchase[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [page, setPage]             = useState(1)
  const [total, setTotal]           = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [showForm, setShowForm]     = useState(false)
  const limit = 100

  const fetchPurchases = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/dashboard/pharmacy/purchases?search=${encodeURIComponent(search)}&page=${page}&limit=${limit}`)
      const data = await res.json()
      if (data.success) {
        setPurchases(data.data.purchases ?? [])
        setTotal(data.data.total ?? 0)
        setTotalPages(data.data.totalPages ?? 1)
      }
    } finally { setLoading(false) }
  }, [search, page])

  useEffect(() => { fetchPurchases() }, [fetchPurchases])

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b">
          <h1 className="text-lg font-semibold text-gray-800">Medicine Purchase List</h1>
          <div className="ml-auto">
            <Button size="sm" onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Purchase Medicine
            </Button>
          </div>
        </div>

        <DataTable<PharmacyPurchase>
          columns={getPurchaseColumns(symbol)}
          data={purchases}
          rowKey={p => p._id}
          loading={loading}
          skeletonRows={8}
          emptyText="No purchases found"
          wrapperClassName="flex-1 overflow-auto"
          searchValue={search}
          onSearchChange={v => { setSearch(v); setPage(1) }}
          toolbarRight={<span className="text-xs text-gray-400">{total} records</span>}
          downloadable
          printable
          fileName="pharmacy-purchases"
        />

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 p-3 border-t text-sm">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border rounded disabled:opacity-40">Prev</button>
            <span>Page {page} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 border rounded disabled:opacity-40">Next</button>
          </div>
        )}
      </div>

      {showForm && (
        <PurchaseMedicineForm
          onClose={() => setShowForm(false)}
          onSaved={fetchPurchases}
        />
      )}
    </div>
  )
}
