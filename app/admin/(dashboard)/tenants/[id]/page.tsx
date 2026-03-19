'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ArrowLeft, Building2, Users, CalendarDays, Stethoscope, CheckCircle2, XCircle } from 'lucide-react'
import { formatDate } from '@/lib/format'

interface Tenant {
  _id: string
  name: string
  slug: string
  whatsappNumber: string
  whatsappPhoneId: string
  whatsappAccessToken: string
  address: string
  plan: 'STARTER' | 'GROWTH' | 'PRO'
  planExpiresAt: string
  isActive: boolean
  brandColor: string
  createdAt: string
}

interface TenantUser {
  _id: string
  name: string
  email: string
  role: 'OWNER' | 'RECEPTIONIST' | 'VIEWER'
  isActive: boolean
  createdAt: string
}

const PLAN_COLOR: Record<string, string> = {
  STARTER: 'bg-gray-100 text-gray-700',
  GROWTH: 'bg-blue-100 text-blue-700',
  PRO: 'bg-orange-100 text-orange-700',
}

const ROLE_COLOR: Record<string, string> = {
  OWNER: 'bg-teal-100 text-teal-700',
  RECEPTIONIST: 'bg-blue-100 text-blue-700',
  VIEWER: 'bg-gray-100 text-gray-600',
}

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [users, setUsers] = useState<TenantUser[]>([])
  const [doctorCount, setDoctorCount] = useState(0)
  const [appointmentCount, setAppointmentCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Editable fields
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [plan, setPlan] = useState('STARTER')
  const [planExpiresAt, setPlanExpiresAt] = useState('')
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [whatsappPhoneId, setWhatsappPhoneId] = useState('')
  const [whatsappAccessToken, setWhatsappAccessToken] = useState('')

  async function load() {
    const res = await fetch(`/api/admin/tenants/${id}`)
    const data = await res.json()
    if (data.success) {
      const t: Tenant = data.data.tenant
      setTenant(t)
      setUsers(data.data.users)
      setDoctorCount(data.data.doctorCount)
      setAppointmentCount(data.data.appointmentCount)
      setName(t.name)
      setAddress(t.address ?? '')
      setPlan(t.plan)
      setPlanExpiresAt(t.planExpiresAt ? t.planExpiresAt.slice(0, 10) : '')
      setWhatsappNumber(t.whatsappNumber)
      setWhatsappPhoneId(t.whatsappPhoneId ?? '')
      setWhatsappAccessToken(t.whatsappAccessToken ?? '')
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  async function save() {
    setSaving(true)
    const res = await fetch(`/api/admin/tenants/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, address, plan, planExpiresAt, whatsappNumber, whatsappPhoneId, whatsappAccessToken }),
    })
    const data = await res.json()
    if (data.success) {
      toast.success('Clinic updated')
      load()
    } else {
      toast.error(data.error)
    }
    setSaving(false)
  }

  async function toggleActive() {
    const res = await fetch(`/api/admin/tenants/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !tenant?.isActive }),
    })
    const data = await res.json()
    if (data.success) {
      toast.success(tenant?.isActive ? 'Clinic suspended' : 'Clinic activated')
      load()
    } else {
      toast.error(data.error)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 max-w-3xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!tenant) return <p className="text-gray-500">Clinic not found</p>

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900 truncate">{tenant.name}</h1>
            <Badge className={`${PLAN_COLOR[tenant.plan]} border-0`}>{tenant.plan}</Badge>
            {tenant.isActive
              ? <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle2 className="w-3.5 h-3.5" /> Active</span>
              : <span className="flex items-center gap-1 text-xs text-red-500"><XCircle className="w-3.5 h-3.5" /> Suspended</span>
            }
          </div>
          <p className="text-sm text-gray-400">{tenant.slug} · Created {formatDate(tenant.createdAt)}</p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger render={
            <button className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tenant.isActive
                ? 'bg-red-50 text-red-600 hover:bg-red-100'
                : 'bg-green-50 text-green-700 hover:bg-green-100'
            }`}>
              {tenant.isActive ? 'Suspend' : 'Activate'}
            </button>
          } />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {tenant.isActive ? 'Suspend this clinic?' : 'Activate this clinic?'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {tenant.isActive
                  ? 'The clinic owner and all users will lose access immediately.'
                  : 'The clinic and its users will regain access.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className={tenant.isActive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
                onClick={toggleActive}
              >
                {tenant.isActive ? 'Yes, suspend' : 'Yes, activate'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Team Members', value: users.length, icon: Users, color: 'bg-indigo-50 text-indigo-600' },
          { label: 'Doctors', value: doctorCount, icon: Stethoscope, color: 'bg-teal-50 text-teal-600' },
          { label: 'Appointments', value: appointmentCount, icon: CalendarDays, color: 'bg-orange-50 text-orange-600' },
        ].map((s) => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.color}`}>
                  <s.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit form */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Clinic Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Clinic Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="City, State" className="h-10" />
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Plan</Label>
              <Select value={plan} onValueChange={(v) => v && setPlan(v)}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="STARTER">Starter</SelectItem>
                  <SelectItem value="GROWTH">Growth</SelectItem>
                  <SelectItem value="PRO">Pro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Plan Expiry</Label>
              <Input type="date" value={planExpiresAt} onChange={(e) => setPlanExpiresAt(e.target.value)} className="h-10" />
            </div>
          </div>

          <Separator />

          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">WhatsApp Config</p>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>WhatsApp Number</Label>
              <Input value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} placeholder="+919876543210" className="h-10 font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label>Phone ID</Label>
              <Input value={whatsappPhoneId} onChange={(e) => setWhatsappPhoneId(e.target.value)} placeholder="Meta Phone ID" className="h-10 font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label>Access Token</Label>
              <Input type="password" value={whatsappAccessToken} onChange={(e) => setWhatsappAccessToken(e.target.value)} placeholder="Meta access token" className="h-10 font-mono" />
            </div>
          </div>

          <Button className="bg-indigo-600 hover:bg-indigo-700 w-full sm:w-auto" onClick={save} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>

      {/* Team members */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Team Members ({users.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-50">
            {users.map((u) => (
              <div key={u._id} className="flex items-center gap-3 px-6 py-3">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs font-semibold">
                    {u.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{u.name}</p>
                  <p className="text-xs text-gray-400 truncate">{u.email}</p>
                </div>
                <Badge className={`${ROLE_COLOR[u.role]} border-0 text-xs`}>{u.role}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
