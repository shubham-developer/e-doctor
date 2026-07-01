'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { useApp, useCurrency } from '@/lib/context'
import { Button } from '@/components/ui/button'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { Plus, X, Trash2, Pencil } from 'lucide-react'

interface RadiologyTest {
  _id: string
  name: string
  shortName: string
  testType?: string
  method?: string
  reportDays: number
  tax: number
  standardCharge: number
  amount: number
}

function TestDialog({
  test,
  onClose,
  onSaved,
}: {
  test?: RadiologyTest | null
  onClose: () => void
  onSaved: (t: RadiologyTest) => void
}) {
  const { sym } = useCurrency()

  const [name,           setName]           = useState(test?.name           ?? '')
  const [shortName,      setShortName]      = useState(test?.shortName      ?? '')
  const [testType,       setTestType]       = useState(test?.testType       ?? '')
  const [method,         setMethod]         = useState(test?.method         ?? '')
  const [reportDays,     setReportDays]     = useState(String(test?.reportDays     ?? 0))
  const [tax,            setTax]            = useState(String(test?.tax            ?? 0))
  const [standardCharge, setStandardCharge] = useState(String(test?.standardCharge ?? 0))
  const [submitting,     setSubmitting]     = useState(false)

  const charge = Number(standardCharge) || 0
  const taxPct = Number(tax) || 0
  const amount = charge + charge * taxPct / 100

  async function handleSave() {
    if (!name.trim())      { toast.error('Test name is required'); return }
    if (!shortName.trim()) { toast.error('Short name is required'); return }
    setSubmitting(true)
    try {
      const url     = test ? `/api/dashboard/radiology/tests/${test._id}` : '/api/dashboard/radiology/tests'
      const method2 = test ? 'PATCH' : 'POST'
      const res  = await fetch(url, {
        method: method2,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(), shortName: shortName.trim(), testType,
          method, reportDays: Number(reportDays), tax: Number(tax),
          standardCharge: charge, amount,
        }),
      })
      const data = await res.json()
      if (!data.success) { toast.error(data.error ?? 'Failed to save'); return }
      toast.success(test ? 'Test updated' : 'Test added')
      onSaved(data.data)
      onClose()
    } finally { setSubmitting(false) }
  }

  const inp = 'h-9 text-sm border border-gray-300 rounded-md px-2.5 w-full focus:outline-none focus:border-blue-400 bg-white'
  const lbl = 'block text-xs font-medium text-gray-700 mb-1'

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl flex flex-col" style={{ maxHeight: '90vh' }}>
        <div className="bg-blue-600 text-white flex items-center justify-between px-5 py-3 rounded-t-xl shrink-0">
          <h2 className="text-sm font-semibold">{test ? 'Edit Test Details' : 'Add Test Details'}</h2>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={lbl}>Test Name <span className="text-red-500">*</span></label>
              <input value={name} onChange={e => setName(e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Short Name <span className="text-red-500">*</span></label>
              <input value={shortName} onChange={e => setShortName(e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Test Type</label>
              <input value={testType} onChange={e => setTestType(e.target.value)} className={inp} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={lbl}>Method</label>
              <input value={method} onChange={e => setMethod(e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Report Days</label>
              <input type="number" min="0" value={reportDays} onChange={e => setReportDays(e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Tax (%)</label>
              <div className="relative">
                <input type="number" min="0" value={tax} onChange={e => setTax(e.target.value)} className={inp + ' pr-7'} />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className={lbl}>Standard Charge ({sym}) <span className="text-red-500">*</span></label>
              <input type="number" min="0" value={standardCharge} onChange={e => setStandardCharge(e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Amount ({sym})</label>
              <input value={amount.toFixed(2)} readOnly className={inp + ' bg-gray-50 text-gray-500'} />
            </div>
          </div>
        </div>

        <div className="border-t px-5 py-3 flex justify-end gap-2 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={submitting}
            className="flex items-center gap-1.5 px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-60"
          >
            {submitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function RadiologyTestsPage() {
  const { user } = useApp()
  const { sym }  = useCurrency()
  const [tests,    setTests]    = useState<RadiologyTest[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [showAdd,  setShowAdd]  = useState(false)
  const [editTest, setEditTest] = useState<RadiologyTest | null>(null)
  const canEdit = user?.role !== 'VIEWER'

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/dashboard/radiology/tests').then(r => r.json())
    if (res.success) setTests(res.data.tests ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleDelete(t: RadiologyTest) {
    if (!confirm(`Delete "${t.name}"?`)) return
    const res  = await fetch(`/api/dashboard/radiology/tests/${t._id}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.success) { toast.success('Test deleted'); setTests(prev => prev.filter(x => x._id !== t._id)) }
    else toast.error(data.error)
  }

  const filtered = search
    ? tests.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || t.shortName.toLowerCase().includes(search.toLowerCase()))
    : tests

  const columns: ColumnDef<RadiologyTest>[] = [
    { key: 'name',     header: 'Test Name',   sortable: true, sortValue: t => t.name,
      render: t => <span className="text-xs font-medium text-gray-900">{t.name}</span> },
    { key: 'short',    header: 'Short Name',  width: 'w-28',
      render: t => <span className="text-xs text-gray-600">{t.shortName}</span> },
    { key: 'testType', header: 'Test Type',   width: 'w-28',
      render: t => <span className="text-xs text-gray-500">{t.testType || '—'}</span> },
    { key: 'method',   header: 'Method',      width: 'w-28',
      render: t => <span className="text-xs text-gray-500">{t.method || '—'}</span> },
    { key: 'days',     header: 'Report Days', width: 'w-24', align: 'center', sortable: true, sortValue: t => t.reportDays,
      render: t => <span className="text-xs font-mono text-gray-700">{t.reportDays}</span> },
    { key: 'tax',      header: 'Tax (%)',     width: 'w-20', align: 'right',
      render: t => <span className="text-xs font-mono text-gray-600">{t.tax.toFixed(2)}</span> },
    { key: 'charge',   header: `Charge (${sym})`, width: 'w-24', align: 'right', sortable: true, sortValue: t => t.standardCharge,
      render: t => <span className="text-xs font-mono text-gray-700">{t.standardCharge.toFixed(2)}</span> },
    { key: 'amount',   header: `Amount (${sym})`, width: 'w-24', align: 'right', sortable: true, sortValue: t => t.amount,
      render: t => <span className="text-xs font-mono font-semibold text-blue-700">{t.amount.toFixed(2)}</span> },
    ...(canEdit ? [{
      key: 'actions', header: '', width: 'w-16',
      render: (t: RadiologyTest) => (
        <div className="flex items-center justify-center gap-1">
          <button onClick={() => setEditTest(t)}
            className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-500 transition-colors">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => handleDelete(t)}
            className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    }] : []),
  ]

  return (
    <>
      {(showAdd || editTest) && (
        <TestDialog
          test={editTest}
          onClose={() => { setShowAdd(false); setEditTest(null) }}
          onSaved={saved => {
            if (editTest) setTests(prev => prev.map(t => t._id === saved._id ? saved : t))
            else setTests(prev => [saved, ...prev])
          }}
        />
      )}

      <div className="h-full flex flex-col bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 shrink-0 bg-gray-50 px-3 py-2">
          <h1 className="text-sm font-semibold text-gray-800">Radiology Tests</h1>
          {canEdit && (
            <Button size="sm" className="h-8 text-xs gap-1 bg-blue-600 hover:bg-blue-700" onClick={() => setShowAdd(true)}>
              <Plus className="w-3.5 h-3.5" /> Add Radiology Test
            </Button>
          )}
        </div>

        <DataTable<RadiologyTest>
          columns={columns}
          data={filtered}
          rowKey={t => t._id}
          loading={loading}
          skeletonRows={6}
          wrapperClassName="flex-1 overflow-auto"
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search tests…"
          downloadable
          printable
          fileName="radiology-tests"
          emptyText="No radiology tests found. Click '+ Add Radiology Test' to create one."
        />

        <div className="px-3 py-1.5 border-t border-gray-200 shrink-0 bg-gray-50">
          <span className="text-xs text-gray-500">Records: {filtered.length} of {tests.length}</span>
        </div>
      </div>
    </>
  )
}
