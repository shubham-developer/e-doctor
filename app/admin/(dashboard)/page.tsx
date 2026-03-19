'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Building2, Users, CalendarDays, Plus, ChevronRight, CheckCircle2, XCircle } from 'lucide-react'
import { formatDate } from '@/lib/format'

interface TenantRow {
  _id: string
  name: string
  slug: string
  plan: 'STARTER' | 'GROWTH' | 'PRO'
  isActive: boolean
  planExpiresAt: string
  whatsappNumber: string
  createdAt: string
  userCount: number
  appointmentCount: number
}

interface Stats {
  total: number
  active: number
  inactive: number
  byPlan: { STARTER: number; GROWTH: number; PRO: number }
}

const PLAN_COLOR: Record<string, string> = {
  STARTER: 'bg-gray-100 text-gray-700',
  GROWTH: 'bg-blue-100 text-blue-700',
  PRO: 'bg-orange-100 text-orange-700',
}

export default function AdminPage() {
  const [tenants, setTenants] = useState<TenantRow[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)

  // New tenant form
  const [newName, setNewName] = useState('')
  const [newSlug, setNewSlug] = useState('')
  const [newWhatsapp, setNewWhatsapp] = useState('')
  const [newPlan, setNewPlan] = useState('STARTER')
  const [ownerName, setOwnerName] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [ownerPassword, setOwnerPassword] = useState('')
  const [creating, setCreating] = useState(false)

  async function load() {
    const res = await fetch('/api/admin/tenants')
    const data = await res.json()
    if (data.success) {
      setTenants(data.data.tenants)
      setStats(data.data.stats)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function createTenant() {
    if (!newName || !newSlug || !newWhatsapp || !ownerName || !ownerEmail || !ownerPassword) {
      toast.error('All fields are required')
      return
    }
    setCreating(true)
    const res = await fetch('/api/admin/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newName,
        slug: newSlug,
        whatsappNumber: newWhatsapp,
        plan: newPlan,
        ownerName,
        ownerEmail,
        ownerPassword,
      }),
    })
    const data = await res.json()
    if (data.success) {
      toast.success('Clinic created')
      setDialogOpen(false)
      setNewName(''); setNewSlug(''); setNewWhatsapp(''); setOwnerName(''); setOwnerEmail(''); setOwnerPassword('')
      load()
    } else {
      toast.error(data.error)
    }
    setCreating(false)
  }

  const filtered = tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.slug.toLowerCase().includes(search.toLowerCase()) ||
      t.whatsappNumber.includes(search)
  )

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tenant Management</h1>
          <p className="text-sm text-gray-500 mt-1">All clinics on the e-doctor platform</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
              <Plus className="w-4 h-4" />
              New Clinic
            </button>
          } />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Clinic</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Clinic Name</Label>
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Sharma Clinic" />
                </div>
                <div className="space-y-1.5">
                  <Label>Slug</Label>
                  <Input value={newSlug} onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))} placeholder="sharma-clinic" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>WhatsApp Number</Label>
                  <Input value={newWhatsapp} onChange={(e) => setNewWhatsapp(e.target.value)} placeholder="+919876543210" />
                </div>
                <div className="space-y-1.5">
                  <Label>Plan</Label>
                  <Select value={newPlan} onValueChange={(v) => v && setNewPlan(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STARTER">Starter</SelectItem>
                      <SelectItem value="GROWTH">Growth</SelectItem>
                      <SelectItem value="PRO">Pro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-1">Owner Account</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Owner Name</Label>
                  <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Dr. Sharma" />
                </div>
                <div className="space-y-1.5">
                  <Label>Owner Email</Label>
                  <Input type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} placeholder="dr@clinic.com" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Temporary Password</Label>
                <Input type="text" value={ownerPassword} onChange={(e) => setOwnerPassword(e.target.value)} placeholder="Min 8 characters" />
              </div>
              <Button className="w-full bg-indigo-600 hover:bg-indigo-700" onClick={createTenant} disabled={creating}>
                {creating ? 'Creating...' : 'Create Clinic'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  <p className="text-xs text-gray-500">Total Clinics</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
                  <p className="text-xs text-gray-500">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.byPlan.PRO + stats.byPlan.GROWTH}</p>
                  <p className="text-xs text-gray-500">Paid Plans</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.inactive}</p>
                  <p className="text-xs text-gray-500">Suspended</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Plan breakdown */}
      {stats && (
        <div className="flex gap-3 flex-wrap">
          {(['STARTER', 'GROWTH', 'PRO'] as const).map((plan) => (
            <span key={plan} className={`px-3 py-1 rounded-full text-sm font-medium ${PLAN_COLOR[plan]}`}>
              {plan}: {stats.byPlan[plan]}
            </span>
          ))}
        </div>
      )}

      {/* Tenant list */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base flex-1">All Clinics</CardTitle>
            <Input
              placeholder="Search by name, slug, number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-64"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-50">
            {filtered.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">No clinics found</p>
            )}
            {filtered.map((t) => (
              <Link
                key={t._id}
                href={`/admin/tenants/${t._id}`}
                className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors group"
              >
                <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-gray-900 truncate">{t.name}</p>
                    {!t.isActive && (
                      <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">Suspended</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">{t.slug} · {t.whatsappNumber}</p>
                </div>
                <div className="hidden sm:flex items-center gap-6 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> {t.userCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <CalendarDays className="w-3.5 h-3.5" /> {t.appointmentCount}
                  </span>
                  <span className="text-gray-400">{formatDate(t.createdAt)}</span>
                </div>
                <Badge className={`${PLAN_COLOR[t.plan]} border-0 text-xs shrink-0`}>{t.plan}</Badge>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 shrink-0" />
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
