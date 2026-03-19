'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useApp } from '@/lib/context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/format'
import { Lock, TrendingUp, IndianRupee, CalendarCheck } from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

interface AnalyticsData {
  appointmentsPerDay: { date: string; count: number }[]
  appointmentsByDoctor: { name: string; count: number; fee: number }[]
  statusBreakdown: { name: string; value: number }[]
  peakHours: { hour: string; count: number }[]
  topSymptoms: { name: string; count: number }[]
  totalRevenue: number
  noShowTrend: { week: string; rate: number }[]
  totalAppointments: number
}

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: '#10b981',
  PENDING: '#f59e0b',
  CANCELLED: '#ef4444',
  COMPLETED: '#3b82f6',
}

function ChartSkeleton() {
  return <Skeleton className="w-full h-56 rounded-xl" />
}

export default function AnalyticsPage() {
  const { tenant } = useApp()
  const t = useTranslations('analytics')
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  const isPlanAllowed = tenant?.plan === 'GROWTH' || tenant?.plan === 'PRO'

  useEffect(() => {
    if (!isPlanAllowed) { setLoading(false); return }
    fetch('/api/dashboard/analytics')
      .then((r) => r.json())
      .then((d) => { if (d.success) setData(d.data) })
      .finally(() => setLoading(false))
  }, [isPlanAllowed])

  if (!isPlanAllowed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 text-center space-y-4">
        <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center">
          <Lock className="w-10 h-10 text-orange-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800">{t('title')}</h2>
        <p className="text-gray-500 max-w-sm">
          {t('planLock')}
        </p>
        <Badge className="bg-orange-100 text-orange-700 text-sm px-4 py-1.5">
          {`Current Plan: ${tenant?.plan ?? 'STARTER'}`}
        </Badge>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <p className="text-gray-500 text-sm mt-1">{t('subtitle')}</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center">
              <CalendarCheck className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('totalAppointments')}</p>
              {loading ? <Skeleton className="h-7 w-12 mt-1" /> : (
                <p className="text-2xl font-bold text-gray-900">{data?.totalAppointments ?? 0}</p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
              <IndianRupee className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('revenue')}</p>
              {loading ? <Skeleton className="h-7 w-20 mt-1" /> : (
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(data?.totalRevenue ?? 0)}</p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm col-span-2 lg:col-span-1">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('noShowRate')}</p>
              {loading ? <Skeleton className="h-7 w-12 mt-1" /> : (
                <p className="text-2xl font-bold text-gray-900">
                  {data?.noShowTrend.length ? data.noShowTrend[data.noShowTrend.length - 1].rate : 0}%
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appointments per day */}
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('perDay')}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <ChartSkeleton /> : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data?.appointmentsPerDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={4} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#0ea5a0" strokeWidth={2} dot={false} name="Appointments" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* By doctor */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('byDoctor')}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <ChartSkeleton /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data?.appointmentsByDoctor} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0ea5a0" radius={[0, 4, 4, 0]} name="Appointments" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Status pie */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('statusBreakdown')}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <ChartSkeleton /> : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={data?.statusBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={false} labelLine={false}>
                    {data?.statusBreakdown.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Peak hours */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('peakHours')}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <ChartSkeleton /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data?.peakHours}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#f97316" radius={[4, 4, 0, 0]} name="Bookings" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top symptoms */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('topSymptoms')}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <ChartSkeleton /> : !data?.topSymptoms.length ? (
              <div className="text-center py-16 text-gray-400 text-sm">{t('noSymptoms')}</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.topSymptoms} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Count" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* No-show trend */}
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('noShowTrend')}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <ChartSkeleton /> : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data?.noShowTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
                  <Tooltip formatter={(v) => `${v}%`} />
                  <Line type="monotone" dataKey="rate" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444', r: 4 }} name="No-show %" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
