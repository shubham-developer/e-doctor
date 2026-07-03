'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { useApp } from '@/lib/context'
import { Plus, Trash2, Search, User, Clock, Activity, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'

// ── Types ─────────────────────────────────────────────────────────────────────

interface PatientOption {
  _id: string
  name: string
  patientCode?: number
  phone?: string
}

interface VitalSigns {
  bp?: string
  pulse?: string
  temp?: string
  weight?: string
  o2Sat?: string
  respRate?: string
}

interface NurseNote {
  _id: string
  patientId: { _id: string; name: string; patientCode?: number } | null
  note: string
  vitalSigns?: VitalSigns
  addedByName: string
  addedByRole: string
  createdAt: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function hasVitals(v?: VitalSigns) {
  if (!v) return false
  return !!(v.bp || v.pulse || v.temp || v.weight || v.o2Sat || v.respRate)
}

function VitalChip({ label, value, unit }: { label: string; value?: string; unit?: string }) {
  if (!value) return null
  return (
    <span className="inline-flex items-center gap-1 bg-primary-50 border border-primary-100 text-primary-800 text-2xs px-2 py-0.5 rounded-full">
      <span className="text-primary-400 font-medium">{label}</span>
      {value}{unit}
    </span>
  )
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

// ── Add Note Dialog ───────────────────────────────────────────────────────────

function AddNoteDialog({
  open,
  onClose,
  onSaved,
  prePatient,
}: {
  open: boolean
  onClose: () => void
  onSaved: (note: NurseNote) => void
  prePatient?: PatientOption | null
}) {
  const [query,         setQuery]         = useState('')
  const [options,       setOptions]       = useState<PatientOption[]>([])
  const [dropOpen,      setDropOpen]      = useState(false)
  const [selectedPat,   setSelectedPat]   = useState<PatientOption | null>(prePatient ?? null)
  const [note,          setNote]          = useState('')
  const [showVitals,    setShowVitals]    = useState(false)
  const [vitals,        setVitals]        = useState<VitalSigns>({})
  const [saving,        setSaving]        = useState(false)
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (prePatient) setSelectedPat(prePatient)
  }, [prePatient])

  useEffect(() => {
    if (!open) {
      setQuery(''); setOptions([]); setDropOpen(false)
      if (!prePatient) setSelectedPat(null)
      setNote(''); setVitals({}); setShowVitals(false)
    }
  }, [open, prePatient])

  function searchPatients(q: string) {
    setQuery(q)
    setDropOpen(true)
    if (searchRef.current) clearTimeout(searchRef.current)
    if (!q.trim()) { setOptions([]); return }
    searchRef.current = setTimeout(async () => {
      const res  = await fetch(`/api/dashboard/patients?search=${encodeURIComponent(q)}&limit=10`)
      const data = await res.json()
      if (data.success) setOptions(data.data.patients ?? [])
    }, 250)
  }

  function pickPatient(p: PatientOption) {
    setSelectedPat(p)
    setQuery(p.name)
    setDropOpen(false)
  }

  function setVital(k: keyof VitalSigns, v: string) {
    setVitals(prev => ({ ...prev, [k]: v }))
  }

  async function handleSave() {
    if (!selectedPat) { toast.error('Please select a patient'); return }
    if (!note.trim()) { toast.error('Note is required'); return }
    setSaving(true)
    try {
      const body: Record<string, unknown> = { patientId: selectedPat._id, note }
      const filled: Record<string, unknown> = {}
      if (vitals.bp)      filled.bp      = vitals.bp
      if (vitals.pulse)   filled.pulse   = Number(vitals.pulse)
      if (vitals.temp)    filled.temp    = Number(vitals.temp)
      if (vitals.weight)  filled.weight  = Number(vitals.weight)
      if (vitals.o2Sat)   filled.o2Sat   = Number(vitals.o2Sat)
      if (vitals.respRate) filled.respRate = Number(vitals.respRate)
      if (Object.keys(filled).length) body.vitalSigns = filled

      const res  = await fetch('/api/dashboard/nurse-notes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!data.success) { toast.error(data.error); return }
      toast.success('Note added')
      onSaved(data.data)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary-600" /> Add Nurse Note
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Patient search */}
          {!prePatient && (
            <div className="relative">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Patient *</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <Input
                  value={selectedPat && !dropOpen ? selectedPat.name : query}
                  onChange={e => { setSelectedPat(null); searchPatients(e.target.value) }}
                  onFocus={() => { if (!selectedPat) setDropOpen(true) }}
                  placeholder="Search patient by name or phone…"
                  className="pl-8 h-9 text-sm"
                />
              </div>
              {dropOpen && options.length > 0 && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {options.map(p => (
                    <button key={p._id} onClick={() => pickPatient(p)}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-primary-50 text-left">
                      <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                        <p className="text-2xs text-gray-400">{p.patientCode ? `ID: ${p.patientCode}` : ''} {p.phone ?? ''}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {prePatient && (
            <div className="flex items-center gap-2 bg-primary-50 border border-primary-100 rounded-lg px-3 py-2">
              <User className="w-4 h-4 text-primary-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-800">{prePatient.name}</p>
                {prePatient.patientCode && <p className="text-2xs text-gray-400">ID: {prePatient.patientCode}</p>}
              </div>
            </div>
          )}

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Note *</label>
            <Textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Enter clinical observation, instructions, or follow-up notes…"
              rows={4}
              className="resize-none text-sm"
            />
          </div>

          {/* Vital signs toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowVitals(v => !v)}
              className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-800 font-medium"
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showVitals ? 'rotate-180' : ''}`} />
              {showVitals ? 'Hide' : 'Add'} Vital Signs (optional)
            </button>

            {showVitals && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {([
                  { key: 'bp',       label: 'BP',        placeholder: '120/80',   unit: ''    },
                  { key: 'pulse',    label: 'Pulse',     placeholder: '72',       unit: 'bpm' },
                  { key: 'temp',     label: 'Temp',      placeholder: '98.6',     unit: '°F'  },
                  { key: 'weight',   label: 'Weight',    placeholder: '70',       unit: 'kg'  },
                  { key: 'o2Sat',    label: 'O₂ Sat',    placeholder: '99',       unit: '%'   },
                  { key: 'respRate', label: 'Resp Rate', placeholder: '16',       unit: '/min'},
                ] as { key: keyof VitalSigns; label: string; placeholder: string; unit: string }[]).map(f => (
                  <div key={f.key}>
                    <label className="block text-2xs text-gray-500 mb-1">{f.label} {f.unit && <span className="text-gray-400">({f.unit})</span>}</label>
                    <Input
                      value={vitals[f.key] ?? ''}
                      onChange={e => setVital(f.key, e.target.value)}
                      placeholder={f.placeholder}
                      className="h-8 text-xs"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="button" className="flex-1 bg-primary-600 hover:bg-primary-700" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Note'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Note Card ─────────────────────────────────────────────────────────────────

function NoteCard({ note, onDelete, canDelete }: { note: NurseNote; onDelete: (id: string) => void; canDelete: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const isLong = note.note.length > 180
  const displayNote = isLong && !expanded ? note.note.slice(0, 180) + '…' : note.note

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:border-primary-200 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
            <User className="w-3.5 h-3.5 text-primary-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-800 truncate">{note.addedByName}</p>
            <p className="text-2xs text-gray-400">{note.addedByRole}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="flex items-center gap-1 text-2xs text-gray-400">
            <Clock className="w-3 h-3" />
            {timeAgo(note.createdAt)}
          </span>
          <span className="text-2xs text-gray-300">
            {new Date(note.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
          {canDelete && (
            <button onClick={() => onDelete(note._id)}
              className="p-1 rounded hover:bg-danger-50 text-gray-300 hover:text-danger-500 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Patient tag (shown on global view) */}
      {note.patientId && (
        <div className="mb-2">
          <span className="inline-flex items-center gap-1 text-2xs font-medium text-primary-700 bg-primary-50 px-2 py-0.5 rounded-full">
            {note.patientId.name}
            {note.patientId.patientCode && ` · ${note.patientId.patientCode}`}
          </span>
        </div>
      )}

      {/* Note text */}
      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{displayNote}</p>
      {isLong && (
        <button onClick={() => setExpanded(e => !e)}
          className="text-xs text-primary-600 hover:underline mt-1">
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}

      {/* Vitals */}
      {hasVitals(note.vitalSigns) && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <VitalChip label="BP"   value={note.vitalSigns?.bp} />
          <VitalChip label="Pulse" value={note.vitalSigns?.pulse?.toString()} unit=" bpm" />
          <VitalChip label="Temp"  value={note.vitalSigns?.temp?.toString()}  unit="°F"  />
          <VitalChip label="Wt"    value={note.vitalSigns?.weight?.toString()} unit=" kg" />
          <VitalChip label="O₂"   value={note.vitalSigns?.o2Sat?.toString()}  unit="%"   />
          <VitalChip label="RR"    value={note.vitalSigns?.respRate?.toString()} unit="/min" />
        </div>
      )}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function NurseNotesPage() {
  const { user } = useApp()
  const [notes,   setNotes]   = useState<NurseNote[]>([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [addOpen, setAddOpen] = useState(false)

  const canWrite = user?.role !== 'VIEWER'

  const loadNotes = useCallback(async () => {
    setLoading(true)
    const res  = await fetch('/api/dashboard/nurse-notes?limit=100')
    const data = await res.json()
    if (data.success) setNotes(data.data)
    setLoading(false)
  }, [])

  useEffect(() => { loadNotes() }, [loadNotes])

  async function handleDelete(id: string) {
    if (!confirm('Delete this note?')) return
    const res  = await fetch(`/api/dashboard/nurse-notes/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.success) {
      toast.success('Note deleted')
      setNotes(prev => prev.filter(n => n._id !== id))
    } else {
      toast.error(data.error)
    }
  }

  function handleSaved(note: NurseNote) {
    setNotes(prev => [note, ...prev])
  }

  const filtered = search.trim()
    ? notes.filter(n =>
        n.patientId?.name.toLowerCase().includes(search.toLowerCase()) ||
        n.note.toLowerCase().includes(search.toLowerCase()) ||
        n.addedByName.toLowerCase().includes(search.toLowerCase())
      )
    : notes

  return (
    <div className="space-y-0 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-4">
        <div>
          <h1 className="text-lg font-semibold text-gray-800">Nurse Notes</h1>
          <p className="text-xs text-gray-400 mt-0.5">{notes.length} total notes</p>
        </div>
        {canWrite && (
          <Button size="sm" className="bg-primary-600 hover:bg-primary-700 h-8 text-xs gap-1.5"
            onClick={() => setAddOpen(true)}>
            <Plus className="w-3.5 h-3.5" /> Add Note
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by patient, note content, or staff…"
          className="w-full pl-9 pr-4 h-9 text-sm border border-gray-300 rounded-lg outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
        />
      </div>

      {/* Notes list */}
      <div className="flex-1 overflow-auto space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="w-7 h-7 rounded-full" />
                <Skeleton className="h-3.5 w-28" />
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Activity className="w-10 h-10 mb-3 opacity-30" />
            <p className="font-semibold">{search ? 'No matching notes' : 'No notes yet'}</p>
            {!search && canWrite && (
              <p className="text-sm mt-1">Click "Add Note" to record the first observation</p>
            )}
          </div>
        ) : (
          filtered.map(n => (
            <NoteCard
              key={n._id}
              note={n}
              canDelete={canWrite && (n.addedByName === user?.name || user?.role === 'OWNER')}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      <AddNoteDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  )
}
