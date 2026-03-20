'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { WalkInModal } from '@/components/reception/WalkInModal'
import { printWalkInToken, printPatientSlip } from '@/components/reception/WalkInTokenSlip'
import { formatTime, formatDate } from '@/lib/format'
import { useApp } from '@/lib/context'
import { MonitorCheck, Users, Printer, FileText } from 'lucide-react'

interface QueueAppointment {
  _id: string
  bookingRef: string
  tokenNumber?: number
  isWalkIn: boolean
  status: 'PENDING' | 'CONFIRMED' | 'ARRIVED' | 'CANCELLED' | 'COMPLETED'
  symptoms: string
  createdAt: string
  arrivedAt?: string
  patientId: { name: string; age: number; whatsappNumber?: string } | null
  doctorId: { name: string; specialization: string } | null
  slotId: { startTime: string; endTime: string; date: string } | null
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  CONFIRMED: 'bg-green-100 text-green-700 border-green-200',
  ARRIVED: 'bg-orange-100 text-orange-700 border-orange-200',
  CANCELLED: 'bg-red-100 text-red-700 border-red-200',
  COMPLETED: 'bg-blue-100 text-blue-700 border-blue-200',
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  ARRIVED: 'Arrived',
  CANCELLED: 'Cancelled',
  COMPLETED: 'Completed',
}

export default function ReceptionPage() {
  const { tenant } = useApp()
  const [appointments, setAppointments] = useState<QueueAppointment[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [newIds, setNewIds] = useState<Set<string>>(new Set())
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const loadQueue = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/dashboard/reception/walkin')
    const data = await res.json()
    if (data.success) setAppointments(data.data)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadQueue()
  }, [loadQueue])

  function handleWalkInSuccess(appointment: unknown) {
    const appt = appointment as QueueAppointment
    setAppointments((prev) => {
      const exists = prev.find((a) => a._id === appt._id)
      return exists ? prev : [appt, ...prev]
    })
    // Highlight new row for 3 seconds
    setNewIds((prev) => new Set([...prev, appt._id]))
    setTimeout(() => {
      setNewIds((prev) => {
        const next = new Set(prev)
        next.delete(appt._id)
        return next
      })
    }, 3000)
  }

  async function updateStatus(id: string, status: string) {
    setUpdatingId(id)
    const res = await fetch(`/api/dashboard/appointments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    const data = await res.json()
    setUpdatingId(null)
    if (data.success) {
      setAppointments((prev) =>
        prev.map((a) => (a._id === id ? { ...a, status: status as QueueAppointment['status'] } : a))
      )
      toast.success(`Status updated to ${STATUS_LABELS[status]}`)
    } else {
      toast.error(data.error || 'Failed to update status')
    }
  }

  function handlePrintToken(appt: QueueAppointment) {
    printWalkInToken({
      tokenNumber: appt.tokenNumber ?? 0,
      patientName: appt.patientId?.name ?? 'Unknown',
      doctorName: appt.doctorId?.name ?? '—',
      slotTime: appt.slotId?.startTime ? formatTime(appt.slotId.startTime) : undefined,
      clinicName: tenant?.name ?? 'Clinic',
      date: formatDate(new Date()),
    })
  }

  function handlePrintSlip(appt: QueueAppointment) {
    printPatientSlip({
      tokenNumber: appt.tokenNumber ?? 0,
      patientName: appt.patientId?.name ?? 'Unknown',
      patientAge: appt.patientId?.age ?? 0,
      patientPhone: appt.patientId?.whatsappNumber,
      doctorName: appt.doctorId?.name ?? '—',
      doctorSpecialization: appt.doctorId?.specialization,
      slotTime: appt.slotId?.startTime ? formatTime(appt.slotId.startTime) : undefined,
      symptoms: appt.symptoms,
      clinicName: tenant?.name ?? 'Clinic',
      date: formatDate(new Date()),
    })
  }

  const active = appointments.filter((a) => a.status !== 'COMPLETED' && a.status !== 'CANCELLED')
  const completed = appointments.filter((a) => a.status === 'COMPLETED')

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MonitorCheck className="w-6 h-6 text-teal-600" />
            Reception
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Today&apos;s queue — {active.length} waiting, {completed.length} completed
          </p>
        </div>
        <Button
          style={{ backgroundColor: '#f97316' }}
          className="hover:opacity-90 text-white gap-2 self-start sm:self-auto"
          onClick={() => setModalOpen(true)}
        >
          🚶 Add Walk-in Patient
        </Button>
      </div>

      {/* Queue */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className="p-4 flex gap-4 items-center">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="w-40 h-4" />
                  <Skeleton className="w-28 h-3" />
                </div>
                <Skeleton className="w-20 h-6 rounded-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : appointments.length === 0 ? (
        <div className="text-center py-20">
          <Users className="w-16 h-16 mx-auto text-gray-200 mb-4" />
          <p className="text-xl font-semibold text-gray-400">No patients today</p>
          <p className="text-sm text-gray-400 mt-2">
            Add a walk-in or wait for WhatsApp bookings to appear.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {appointments.map((appt) => {
            const isNew = newIds.has(appt._id)
            const isUpdating = updatingId === appt._id

            return (
              <Card
                key={appt._id}
                className={`border-0 shadow-sm overflow-hidden transition-colors duration-500 ${
                  isNew ? 'ring-2 ring-orange-400 bg-orange-50' : ''
                }`}
              >
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* Token */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 shrink-0 rounded-full bg-teal-50 border-2 border-teal-200 flex items-center justify-center">
                      <span className="text-sm font-bold text-teal-700">
                        {appt.tokenNumber ?? '–'}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900 text-sm">
                          {appt.patientId?.name ?? 'Unknown'}
                          {appt.patientId?.age ? (
                            <span className="text-gray-400 font-normal"> · {appt.patientId.age}y</span>
                          ) : null}
                        </p>
                        {appt.isWalkIn && (
                          <Badge className="bg-orange-100 text-orange-700 border border-orange-200 text-xs font-bold">
                            WALK-IN
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {appt.doctorId?.name ?? '—'}
                        {appt.slotId?.startTime
                          ? ` · ${formatTime(appt.slotId.startTime)}`
                          : appt.isWalkIn
                          ? ' · Next available'
                          : ''}
                      </p>
                      {appt.symptoms && (
                        <p className="text-xs text-gray-400 truncate max-w-xs">{appt.symptoms}</p>
                      )}
                    </div>
                  </div>

                  {/* Status + Actions */}
                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    <Badge className={`font-semibold border text-xs ${STATUS_STYLES[appt.status]}`}>
                      {STATUS_LABELS[appt.status]}
                    </Badge>

                    {(appt.status === 'PENDING' || appt.status === 'CONFIRMED') && (
                      <Button
                        size="sm"
                        className="bg-orange-500 hover:bg-orange-600 text-white text-xs h-7 px-3"
                        disabled={isUpdating}
                        onClick={() => updateStatus(appt._id, 'ARRIVED')}
                      >
                        Mark Arrived
                      </Button>
                    )}

                    {appt.status === 'ARRIVED' && (
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-7 px-3"
                        disabled={isUpdating}
                        onClick={() => updateStatus(appt._id, 'COMPLETED')}
                      >
                        Mark Complete
                      </Button>
                    )}

                    {/* Print buttons */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-gray-500 hover:text-gray-800"
                      title="Print patient info slip"
                      onClick={() => handlePrintSlip(appt)}
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-gray-500 hover:text-gray-800"
                      title="Print token slip"
                      onClick={() => handlePrintToken(appt)}
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <WalkInModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={handleWalkInSuccess}
      />
    </div>
  )
}
