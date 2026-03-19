'use client'

import { useEffect, useState, useCallback } from 'react'
import { format, addDays, startOfWeek, parseISO } from 'date-fns'
import { toast } from 'sonner'
import { useApp } from '@/lib/context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatTime } from '@/lib/format'
import { Plus, ChevronLeft, ChevronRight, Lock, CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'

interface Doctor {
  _id: string
  name: string
  specialization: string
}

interface Slot {
  _id: string
  doctorId: Doctor | string
  date: string
  startTime: string
  endTime: string
  isBooked: boolean
  isBlocked: boolean
}

const DOCTOR_COLORS = [
  'bg-teal-100 text-teal-700 border-teal-200',
  'bg-blue-100 text-blue-700 border-blue-200',
  'bg-purple-100 text-purple-700 border-purple-200',
  'bg-orange-100 text-orange-700 border-orange-200',
  'bg-pink-100 text-pink-700 border-pink-200',
]

export default function SlotsPage() {
  const { user } = useApp()
  const t = useTranslations('slots')
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [slots, setSlots] = useState<Slot[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [filterDoctor, setFilterDoctor] = useState('ALL')
  const canEdit = user?.role !== 'VIEWER'

  // Form state
  const [formDoctorId, setFormDoctorId] = useState('')
  const [formStartDate, setFormStartDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [formEndDate, setFormEndDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [formStartTime, setFormStartTime] = useState('09:00')
  const [formEndTime, setFormEndTime] = useState('13:00')
  const [formDuration, setFormDuration] = useState('30')
  const [formRepeat, setFormRepeat] = useState(false)
  const [formWeekCount, setFormWeekCount] = useState('4')
  const [saving, setSaving] = useState(false)

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const startDate = format(weekStart, 'yyyy-MM-dd')
  const endDate = format(addDays(weekStart, 6), 'yyyy-MM-dd')

  const loadSlots = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/dashboard/slots?startDate=${startDate}&endDate=${endDate}`)
    const data = await res.json()
    if (data.success) setSlots(data.data)
    setLoading(false)
  }, [startDate, endDate])

  useEffect(() => {
    fetch('/api/dashboard/doctors')
      .then((r) => r.json())
      .then((d) => { if (d.success) setDoctors(d.data) })
  }, [])

  useEffect(() => { loadSlots() }, [loadSlots])

  const doctorColorMap = new Map(doctors.map((d, i) => [d._id, DOCTOR_COLORS[i % DOCTOR_COLORS.length]]))

  function getSlotsForDay(date: string) {
    return slots.filter((s) => {
      const doctorId = typeof s.doctorId === 'string' ? s.doctorId : (s.doctorId as Doctor)?._id
      if (filterDoctor !== 'ALL' && doctorId !== filterDoctor) return false
      return s.date === date
    })
  }

  async function handleAddSlots(e: React.FormEvent) {
    e.preventDefault()
    if (!formDoctorId) { toast.error('Please select a doctor'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/dashboard/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorId: formDoctorId,
          startDate: formStartDate,
          endDate: formEndDate,
          startTime: formStartTime,
          endTime: formEndTime,
          durationMin: Number(formDuration),
          repeatWeekly: formRepeat,
          weekCount: Number(formWeekCount),
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`${data.data.created} slots created`)
        setAddOpen(false)
        loadSlots()
      } else {
        toast.error(data.error)
      }
    } finally {
      setSaving(false)
    }
  }

  async function toggleBlock(slot: Slot) {
    const res = await fetch(`/api/dashboard/slots/${slot._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isBlocked: !slot.isBlocked }),
    })
    const data = await res.json()
    if (data.success) {
      toast.success(slot.isBlocked ? 'Slot unblocked' : 'Slot blocked')
      loadSlots()
    } else {
      toast.error(data.error)
    }
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-500 text-sm mt-1">{t('subtitle')}</p>
        </div>
        {canEdit && (
          <>
            <Button className="bg-teal-600 hover:bg-teal-700 gap-2 self-start sm:self-auto" onClick={() => setAddOpen(true)}>
              <Plus className="w-4 h-4" />
              {t('addSlots')}
            </Button>
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{t('addNew')}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddSlots} className="space-y-4">
                <div className="space-y-2">
                  <Label>Doctor *</Label>
                  <Select value={formDoctorId} onValueChange={(v) => v && setFormDoctorId(v)}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select doctor" />
                    </SelectTrigger>
                    <SelectContent>
                      {doctors.filter((d) => d).map((d) => (
                        <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Start Date *</Label>
                    <Input type="date" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)} className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input type="date" value={formEndDate} min={formStartDate} onChange={(e) => setFormEndDate(e.target.value)} className="h-11" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Start Time *</Label>
                    <Input type="time" value={formStartTime} onChange={(e) => setFormStartTime(e.target.value)} className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label>End Time *</Label>
                    <Input type="time" value={formEndTime} onChange={(e) => setFormEndTime(e.target.value)} className="h-11" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Slot Duration</Label>
                  <Select value={formDuration} onValueChange={(v) => v && setFormDuration(v)}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="60">60 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Repeat Weekly</p>
                    <p className="text-xs text-gray-500">Auto-generate recurring slots</p>
                  </div>
                  <Switch checked={formRepeat} onCheckedChange={setFormRepeat} />
                </div>
                {formRepeat && (
                  <div className="space-y-2">
                    <Label>Repeat for how many weeks?</Label>
                    <Select value={formWeekCount} onValueChange={(v) => v && setFormWeekCount(v)}>
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 6, 8, 12].map((w) => (
                          <SelectItem key={w} value={String(w)}>{w} week{w > 1 ? 's' : ''}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex gap-3">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>Cancel</Button>
                  <Button type="submit" className="flex-1 bg-teal-600 hover:bg-teal-700" disabled={saving}>
                    {saving ? 'Creating...' : 'Create Slots'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          </>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Week navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setWeekStart(addDays(weekStart, -7))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium min-w-48 text-center">
            {format(weekStart, 'dd MMM')} – {format(addDays(weekStart, 6), 'dd MMM yyyy')}
          </span>
          <Button variant="outline" size="icon" onClick={() => setWeekStart(addDays(weekStart, 7))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
            {t('today')}
          </Button>
        </div>

        {/* Doctor filter */}
        <Select value={filterDoctor} onValueChange={(v) => v && setFilterDoctor(v)}>
          <SelectTrigger className="w-48 h-9">
            <SelectValue placeholder="All Doctors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Doctors</SelectItem>
            {doctors.map((d) => (
              <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs text-gray-600">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-200 border border-green-300" /> Available</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-200 border border-blue-300" /> Booked</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-200 border border-gray-300" /> Blocked</span>
        </div>
      </div>

      {/* Week calendar */}
      <div className="overflow-x-auto">
        <div className="grid grid-cols-7 gap-2 min-w-[700px]">
          {weekDays.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd')
            const daySlots = getSlotsForDay(dateStr)
            const isToday = dateStr === format(new Date(), 'yyyy-MM-dd')

            return (
              <div key={dateStr} className="space-y-2">
                {/* Day header */}
                <div className={cn(
                  'text-center py-2 rounded-lg',
                  isToday ? 'bg-teal-600 text-white' : 'bg-white border border-gray-100'
                )}>
                  <p className="text-xs font-medium">{format(day, 'EEE')}</p>
                  <p className="text-lg font-bold">{format(day, 'd')}</p>
                </div>

                {/* Slots */}
                <div className="space-y-1 min-h-20">
                  {loading ? (
                    [...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)
                  ) : daySlots.length === 0 ? (
                    <div className="text-center py-4 text-gray-300 text-xs">—</div>
                  ) : (
                    daySlots.map((slot) => {
                      const doc = typeof slot.doctorId === 'object' ? slot.doctorId as Doctor : null
                      const colorClass = doc ? doctorColorMap.get(doc._id) ?? DOCTOR_COLORS[0] : DOCTOR_COLORS[0]

                      return (
                        <div
                          key={slot._id}
                          className={cn(
                            'text-xs p-1.5 rounded-lg border relative group cursor-pointer transition-opacity',
                            slot.isBlocked
                              ? 'bg-gray-100 text-gray-400 border-gray-200'
                              : slot.isBooked
                              ? 'bg-blue-100 text-blue-700 border-blue-200'
                              : colorClass
                          )}
                          title={`${doc?.name ?? ''} · ${formatTime(slot.startTime)}`}
                        >
                          <p className="font-semibold">{formatTime(slot.startTime)}</p>
                          {doc && <p className="truncate opacity-80">{doc.name.split(' ').pop()}</p>}

                          {/* Block toggle */}
                          {canEdit && !slot.isBooked && (
                            <button
                              onClick={() => toggleBlock(slot)}
                              className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 p-0.5 rounded bg-white/80 hover:bg-white transition-opacity"
                              title={slot.isBlocked ? 'Unblock' : 'Block'}
                            >
                              <Lock className={cn('w-2.5 h-2.5', slot.isBlocked ? 'text-orange-500' : 'text-gray-500')} />
                            </button>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Doctor color key */}
      {doctors.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-gray-700 mb-3">{t('colorCode')}</p>
            <div className="flex flex-wrap gap-3">
              {doctors.map((d, i) => (
                <div key={d._id} className={cn('flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium', DOCTOR_COLORS[i % DOCTOR_COLORS.length])}>
                  <span>{d.name}</span>
                  <span className="text-xs opacity-70">{d.specialization}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
