'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { useApp } from '@/lib/context'
import { StatCard } from '@/components/dashboard/StatCard'
import { StatusBadge } from '@/components/dashboard/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatTime, formatDate } from '@/lib/format'
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  XCircle,
  UserPlus,
  CalendarPlus,
  ClipboardList,
  Users,
  Stethoscope,
  TrendingDown,
  ChevronRight,
} from 'lucide-react'

interface Stats {
  today: { total: number; confirmed: number; pending: number; cancelled: number; completed: number }
  upcoming: Array<{
    id: string
    bookingRef: string
    status: string
    symptoms: string
    patient: { name: string; age: number; whatsappNumber: string }
    doctor: { name: string; specialization: string }
    slot: { startTime: string; endTime: string; date: string }
  }>
  noShowRate: number
  totalDoctors: number
  totalPatients: number
}

export default function DashboardPage() {
  const { tenant } = useApp()
  const router = useRouter()
  const t = useTranslations('dashboard')
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setStats(d.data)
        else toast.error('Failed to load stats')
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-500 text-sm mt-1">{formatDate(new Date())}</p>
        </div>

        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2 self-start sm:self-auto">
          <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
          <div>
            <p className="text-sm font-semibold text-green-700">{t('botLive')}</p>
            <p className="text-xs text-green-600">{tenant?.whatsappNumber}</p>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard label={t('todayAppointments')} value={stats?.today.total ?? 0} icon={CalendarCheck} color="text-teal-600" bgColor="bg-teal-50" loading={loading} />
        <StatCard label={t('confirmed')} value={stats?.today.confirmed ?? 0} icon={CheckCircle2} color="text-green-600" bgColor="bg-green-50" loading={loading} />
        <StatCard label={t('pending')} value={stats?.today.pending ?? 0} icon={Clock} color="text-yellow-600" bgColor="bg-yellow-50" loading={loading} />
        <StatCard label={t('cancelled')} value={stats?.today.cancelled ?? 0} icon={XCircle} color="text-red-600" bgColor="bg-red-50" loading={loading} />
      </div>

      {/* Second row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Upcoming appointments */}
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">{t('upcoming')}</CardTitle>
            <Link href="/dashboard/appointments">
              <Button variant="ghost" size="sm" className="text-teal-600 gap-1">
                {t('viewAll')} <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-3 p-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-xl" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                ))}
              </div>
            ) : !stats?.upcoming.length ? (
              <div className="text-center py-12 text-gray-500">
                <CalendarCheck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">{t('noAppointments')}</p>
                <p className="text-sm mt-1">{t('noAppointmentsDesc')}</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {stats.upcoming.map((appt) => (
                  <div
                    key={appt.id}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => router.push('/dashboard/appointments')}
                  >
                    <div className="w-16 h-14 bg-teal-50 rounded-xl flex flex-col items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-teal-700">
                        {formatTime(appt.slot.startTime).split(' ')[0]}
                      </span>
                      <span className="text-xs text-teal-500">
                        {formatTime(appt.slot.startTime).split(' ')[1]}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">
                        {appt.patient?.name}
                        {appt.patient?.age ? <span className="text-gray-400 font-normal"> · {appt.patient.age}y</span> : null}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {appt.doctor?.name} · {appt.symptoms || 'No symptoms noted'}
                      </p>
                    </div>
                    <StatusBadge status={appt.status as 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right column */}
        <div className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">{t('overview')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Stethoscope className="w-4 h-4 text-teal-500" />
                  {t('activeDoctors')}
                </div>
                {loading ? <Skeleton className="h-5 w-8" /> : (
                  <span className="font-bold text-gray-900">{stats?.totalDoctors ?? 0}</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users className="w-4 h-4 text-blue-500" />
                  {t('totalPatients')}
                </div>
                {loading ? <Skeleton className="h-5 w-8" /> : (
                  <span className="font-bold text-gray-900">{stats?.totalPatients ?? 0}</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <TrendingDown className="w-4 h-4 text-red-500" />
                  {t('noShowRate')}
                </div>
                {loading ? <Skeleton className="h-5 w-12" /> : (
                  <span className={`font-bold ${(stats?.noShowRate ?? 0) > 20 ? 'text-red-600' : 'text-green-600'}`}>
                    {stats?.noShowRate ?? 0}%
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">{t('quickActions')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/dashboard/doctors">
                <Button variant="outline" className="w-full justify-start gap-2 h-10 text-sm">
                  <UserPlus className="w-4 h-4 text-teal-600" />
                  {t('addDoctor')}
                </Button>
              </Link>
              <Link href="/dashboard/slots">
                <Button variant="outline" className="w-full justify-start gap-2 h-10 text-sm">
                  <CalendarPlus className="w-4 h-4 text-orange-500" />
                  {t('addSlots')}
                </Button>
              </Link>
              <Link href="/dashboard/appointments">
                <Button variant="outline" className="w-full justify-start gap-2 h-10 text-sm">
                  <ClipboardList className="w-4 h-4 text-blue-500" />
                  {t('viewAllAppts')}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
