'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { useApp } from '@/lib/context'
import { StatusBadge } from '@/components/dashboard/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatTime, formatDate, formatPhone } from '@/lib/format'
import { Search, Download, ChevronDown, ChevronUp, ClipboardList } from 'lucide-react'

interface Appointment {
  _id: string
  bookingRef: string
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'
  symptoms: string
  createdAt: string
  patientId: { name: string; age: number; whatsappNumber: string } | null
  doctorId: { name: string; specialization: string } | null
  slotId: { startTime: string; endTime: string; date: string } | null
}

type Status = 'ALL' | 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'

export default function AppointmentsPage() {
  const { user } = useApp()
  const t = useTranslations('appointments')
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [doctors, setDoctors] = useState<{ _id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<Status>('ALL')
  const [doctorFilter, setDoctorFilter] = useState('ALL')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [actionAppt, setActionAppt] = useState<Appointment | null>(null)
  const canEdit = user?.role !== 'VIEWER'

  async function loadDoctors() {
    const res = await fetch('/api/dashboard/doctors')
    const d = await res.json()
    if (d.success) setDoctors(d.data)
  }

  const loadAppointments = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter !== 'ALL') params.set('status', statusFilter)
    if (doctorFilter !== 'ALL') params.set('doctorId', doctorFilter)
    if (search) params.set('search', search)

    const res = await fetch(`/api/dashboard/appointments?${params}`)
    const data = await res.json()
    if (data.success) {
      setAppointments(data.data.appointments)
      setTotal(data.data.total)
    }
    setLoading(false)
  }, [statusFilter, doctorFilter, search])

  useEffect(() => { loadDoctors() }, [])
  useEffect(() => { loadAppointments() }, [loadAppointments])

  async function updateStatus(id: string, status: string) {
    const res = await fetch(`/api/dashboard/appointments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    const data = await res.json()
    if (data.success) {
      toast.success(`Status updated to ${status}`)
      setActionAppt(null)
      loadAppointments()
    } else {
      toast.error(data.error)
    }
  }

  function exportCSV() {
    const rows = [
      ['Booking Ref', 'Patient', 'Age', 'Phone', 'Doctor', 'Date', 'Time', 'Symptoms', 'Status'],
      ...appointments.map((a) => [
        a.bookingRef,
        a.patientId?.name ?? '',
        a.patientId?.age ?? '',
        a.patientId?.whatsappNumber ?? '',
        a.doctorId?.name ?? '',
        a.slotId?.date ?? '',
        a.slotId?.startTime ? formatTime(a.slotId.startTime) : '',
        a.symptoms,
        a.status,
      ]),
    ]
    const csv = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `appointments_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    toast.success('CSV exported')
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-500 text-sm mt-1">
            {total} {t('totalRecords')}
          </p>
        </div>
        <Button variant="outline" className="gap-2 self-start sm:self-auto" onClick={exportCSV}>
          <Download className="w-4 h-4" />
          {t('exportCsv')}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as Status)}>
          <SelectTrigger className="w-40 h-10">
            <SelectValue placeholder={t('allStatus')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t('allStatus')}</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="CONFIRMED">Confirmed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={doctorFilter} onValueChange={(v) => v && setDoctorFilter(v)}>
          <SelectTrigger className="w-48 h-10">
            <SelectValue placeholder={t('allDoctors')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t('allDoctors')}</SelectItem>
            {doctors.map((d) => (
              <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className="p-4 flex gap-4 items-center">
                <Skeleton className="w-20 h-4" />
                <Skeleton className="w-32 h-4" />
                <Skeleton className="w-28 h-4 hidden sm:block" />
                <Skeleton className="w-24 h-4 hidden md:block" />
                <Skeleton className="w-20 h-6 rounded-full ml-auto" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !appointments.length ? (
        <div className="text-center py-20">
          <ClipboardList className="w-16 h-16 mx-auto text-gray-200 mb-4" />
          <p className="text-xl font-semibold text-gray-400">
            {t('noData')}
          </p>
          <p className="text-sm text-gray-400 mt-2">
            {t('noDataDesc')}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {appointments.map((appt) => (
            <Card key={appt._id} className="border-0 shadow-sm overflow-hidden">
              <div
                className="p-4 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpanded(expanded === appt._id ? null : appt._id)}
              >
                {/* Booking ref */}
                <div className="w-24 shrink-0">
                  <p className="text-xs font-mono font-semibold text-teal-700">{appt.bookingRef}</p>
                  <p className="text-xs text-gray-400">{appt.slotId?.date ? formatDate(appt.slotId.date) : '—'}</p>
                </div>

                {/* Patient */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">
                    {appt.patientId?.name ?? 'Unknown'}
                    {appt.patientId?.age ? <span className="text-gray-400 font-normal"> · {appt.patientId.age}y</span> : null}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{appt.doctorId?.name ?? '—'}</p>
                </div>

                {/* Time */}
                <div className="hidden sm:block w-20 shrink-0">
                  <p className="text-sm font-medium text-gray-700">
                    {appt.slotId?.startTime ? formatTime(appt.slotId.startTime) : '—'}
                  </p>
                </div>

                {/* Status */}
                <StatusBadge status={appt.status} />

                {/* Expand icon */}
                {expanded === appt._id ? (
                  <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                )}
              </div>

              {/* Expanded details */}
              {expanded === appt._id && (
                <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">{t('patientLabel')}</p>
                      <p className="font-medium">{appt.patientId?.name ?? '—'}</p>
                      <p className="text-gray-500">{appt.patientId?.age ? `Age: ${appt.patientId.age}` : ''}</p>
                      <p className="text-gray-500">{appt.patientId?.whatsappNumber ? formatPhone(appt.patientId.whatsappNumber) : ''}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">{t('doctorLabel')}</p>
                      <p className="font-medium">{appt.doctorId?.name ?? '—'}</p>
                      <p className="text-gray-500">{appt.doctorId?.specialization ?? ''}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">{t('appointmentLabel')}</p>
                      <p className="font-medium">{appt.slotId?.date ? formatDate(appt.slotId.date) : '—'}</p>
                      <p className="text-gray-500">
                        {appt.slotId?.startTime ? formatTime(appt.slotId.startTime) : ''} –{' '}
                        {appt.slotId?.endTime ? formatTime(appt.slotId.endTime) : ''}
                      </p>
                    </div>
                    <div className="col-span-2 sm:col-span-3">
                      <p className="text-xs text-gray-500 mb-1">{t('symptomsLabel')}</p>
                      <p className="font-medium">{appt.symptoms || t('notProvided')}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  {canEdit && (
                    <div className="flex flex-wrap gap-2">
                      {appt.status === 'PENDING' && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => updateStatus(appt._id, 'CONFIRMED')}
                        >
                          {t('confirm')}
                        </Button>
                      )}
                      {(appt.status === 'PENDING' || appt.status === 'CONFIRMED') && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => updateStatus(appt._id, 'CANCELLED')}
                        >
                          {t('cancel')}
                        </Button>
                      )}
                      {appt.status === 'CONFIRMED' && (
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={() => updateStatus(appt._id, 'COMPLETED')}
                        >
                          {t('markComplete')}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
