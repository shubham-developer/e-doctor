'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { useApp } from '@/lib/context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
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
import { Separator } from '@/components/ui/separator'
import { formatDate } from '@/lib/format'
import {
  Building2,
  MessageSquare,
  Bell,
  Users,
  CreditCard,
  AlertTriangle,
  Plus,
  Trash2,
  CheckCircle2,
  Copy,
} from 'lucide-react'

interface TenantData {
  _id: string
  name: string
  address: string
  whatsappNumber: string
  whatsappPhoneId: string
  logoUrl: string
  brandColor: string
  plan: 'STARTER' | 'GROWTH' | 'PRO'
  planExpiresAt: string
  notifications: { reminder24h: boolean; reminder1h: boolean }
}

interface TeamUser {
  _id: string
  name: string
  email: string
  role: 'OWNER' | 'RECEPTIONIST' | 'VIEWER'
}

const PLAN_FEATURES: Record<string, string[]> = {
  STARTER: ['Up to 2 doctors', 'Basic appointments', 'Slot management'],
  GROWTH: ['Up to 10 doctors', 'Analytics dashboard', 'Broadcast messages', 'Priority support'],
  PRO: ['Unlimited doctors', 'All Growth features', 'Custom branding', 'API access', 'Dedicated support'],
}

export default function SettingsPage() {
  const { user, tenant: ctxTenant, refetch } = useApp()
  const t = useTranslations('settings')
  const [loading, setLoading] = useState(true)
  const [tenantData, setTenantData] = useState<TenantData | null>(null)
  const [users, setUsers] = useState<TeamUser[]>([])
  const [saving, setSaving] = useState(false)
  const isOwner = user?.role === 'OWNER'

  // Form fields
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [brandColor, setBrandColor] = useState('#0ea5a0')
  const [reminder24h, setReminder24h] = useState(true)
  const [reminder1h, setReminder1h] = useState(true)

  // Add user form
  const [newUserName, setNewUserName] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserRole, setNewUserRole] = useState('RECEPTIONIST')
  const [addingUser, setAddingUser] = useState(false)

  async function loadSettings() {
    const res = await fetch('/api/dashboard/settings')
    const data = await res.json()
    if (data.success) {
      const t = data.data.tenant
      setTenantData(t)
      setUsers(data.data.users)
      setName(t.name)
      setAddress(t.address ?? '')
      setBrandColor(t.brandColor ?? '#0ea5a0')
      setReminder24h(t.notifications?.reminder24h ?? true)
      setReminder1h(t.notifications?.reminder1h ?? true)
    }
    setLoading(false)
  }

  useEffect(() => { loadSettings() }, [])

  async function saveProfile() {
    setSaving(true)
    const res = await fetch('/api/dashboard/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, address, brandColor }),
    })
    const data = await res.json()
    if (data.success) {
      toast.success('Profile updated')
      refetch()
    } else {
      toast.error(data.error)
    }
    setSaving(false)
  }

  async function saveNotifications() {
    const res = await fetch('/api/dashboard/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notifications: { reminder24h, reminder1h } }),
    })
    const data = await res.json()
    if (data.success) {
      toast.success('Notification settings saved')
    } else {
      toast.error(data.error)
    }
  }

  async function addUser() {
    if (!newUserName || !newUserEmail) { toast.error('Name and email required'); return }
    setAddingUser(true)
    const res = await fetch('/api/dashboard/settings/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newUserName, email: newUserEmail, userRole: newUserRole }),
    })
    const data = await res.json()
    if (data.success) {
      toast.success(`User added! Temp password: ${data.data.tempPassword}`, { duration: 10000 })
      setNewUserName('')
      setNewUserEmail('')
      loadSettings()
    } else {
      toast.error(data.error)
    }
    setAddingUser(false)
  }

  async function changeRole(userId: string, role: string) {
    const res = await fetch(`/api/dashboard/settings/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    const data = await res.json()
    if (data.success) { toast.success('Role updated'); loadSettings() }
    else toast.error(data.error)
  }

  async function removeUser(userId: string) {
    const res = await fetch(`/api/dashboard/settings/users/${userId}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.success) { toast.success('User removed'); loadSettings() }
    else toast.error(data.error)
  }

  if (loading) {
    return (
      <div className="space-y-4 max-w-3xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <p className="text-gray-500 text-sm mt-1">{t('subtitle')}</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="grid grid-cols-3 sm:grid-cols-6 w-full h-auto gap-1 p-1">
          <TabsTrigger value="profile" className="flex items-center gap-1.5 text-xs">
            <Building2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('profileTab')}</span>
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="flex items-center gap-1.5 text-xs">
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">WhatsApp</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-1.5 text-xs">
            <Bell className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('notificationsTab')}</span>
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-1.5 text-xs">
            <Users className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('teamTab')}</span>
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex items-center gap-1.5 text-xs">
            <CreditCard className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('billingTab')}</span>
          </TabsTrigger>
          {isOwner && (
            <TabsTrigger value="danger" className="flex items-center gap-1.5 text-xs text-red-500">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('dangerTab')}</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4 mt-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">{t('clinicNameLabel')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t('clinicNameLabel')}</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="h-11" disabled={!isOwner} />
              </div>
              <div className="space-y-2">
                <Label>{t('addressLabel')}</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder={t('addressPlaceholder')} className="h-11" disabled={!isOwner} />
              </div>
              <div className="space-y-2">
                <Label>{t('brandColorLabel')}</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="w-12 h-11 rounded-lg border border-gray-200 cursor-pointer"
                    disabled={!isOwner}
                  />
                  <Input value={brandColor} onChange={(e) => setBrandColor(e.target.value)} className="h-11 font-mono" disabled={!isOwner} />
                </div>
              </div>
              {isOwner && (
                <Button className="bg-teal-600 hover:bg-teal-700 w-full sm:w-auto" onClick={saveProfile} disabled={saving}>
                  {saving ? t('saving') : t('save')}
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* WhatsApp Tab */}
        <TabsContent value="whatsapp" className="space-y-4 mt-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">{t('whatsappTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-200">
                <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />
                <div>
                  <p className="font-semibold text-green-700">{t('connected')}</p>
                  <p className="text-sm text-green-600">{tenantData?.whatsappNumber}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500">WhatsApp Number</Label>
                  <div className="flex items-center gap-2">
                    <Input value={tenantData?.whatsappNumber ?? ''} readOnly className="h-10 bg-gray-50 font-mono text-sm" />
                    <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(tenantData?.whatsappNumber ?? ''); toast.success(t('copied')) }}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-500">Phone ID (read-only)</Label>
                  <Input value={tenantData?.whatsappPhoneId ?? ''} readOnly className="h-10 bg-gray-50 font-mono text-sm" />
                </div>
              </div>

              <p className="text-xs text-gray-500">
                {t('whatsappNote')}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4 mt-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">{t('notificationsTitle')}</CardTitle>
              <CardDescription>{t('notificationsDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100">
                <div>
                  <p className="font-medium">{t('reminder24h')}</p>
                  <p className="text-sm text-gray-500">{t('reminder24hDesc')}</p>
                </div>
                <Switch checked={reminder24h} onCheckedChange={setReminder24h} />
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100">
                <div>
                  <p className="font-medium">{t('reminder1h')}</p>
                  <p className="text-sm text-gray-500">{t('reminder1hDesc')}</p>
                </div>
                <Switch checked={reminder1h} onCheckedChange={setReminder1h} />
              </div>
              <Button className="bg-teal-600 hover:bg-teal-700 w-full sm:w-auto" onClick={saveNotifications}>
                {t('saveSettings')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-4 mt-6">
          {/* Add user */}
          {isOwner && (
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">{t('addMemberTitle')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input placeholder="Full name" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} className="h-10" />
                  <Input type="email" placeholder="email@clinic.com" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} className="h-10" />
                </div>
                <div className="flex gap-3">
                  <Select value={newUserRole} onValueChange={(v) => v && setNewUserRole(v)}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RECEPTIONIST">Receptionist</SelectItem>
                      <SelectItem value="VIEWER">Viewer (read-only)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button className="bg-teal-600 hover:bg-teal-700 gap-2" onClick={addUser} disabled={addingUser}>
                    <Plus className="w-4 h-4" />
                    {t('addMember')}
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  {t('addMemberNote')}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Users list */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">{t('teamMembersTitle')} ({users.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-50">
                {users.map((u) => (
                  <div key={u._id} className="flex items-center gap-3 p-4">
                    <Avatar className="w-9 h-9">
                      <AvatarFallback className="bg-teal-100 text-teal-700 text-sm font-semibold">
                        {u.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">{u.name}</p>
                      <p className="text-xs text-gray-500 truncate">{u.email}</p>
                    </div>
                    {isOwner && u._id !== user?.id ? (
                      <div className="flex items-center gap-2">
                        <Select value={u.role} onValueChange={(r) => r && changeRole(u._id, r)}>
                          <SelectTrigger className="h-8 w-36 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="OWNER">Owner</SelectItem>
                            <SelectItem value="RECEPTIONIST">Receptionist</SelectItem>
                            <SelectItem value="VIEWER">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                        <AlertDialog>
                          <AlertDialogTrigger render={<button className="w-8 h-8 inline-flex items-center justify-center rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors" />}>
                            <Trash2 className="w-4 h-4" />
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t('removeUserTitle', { name: u.name })}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t('removeUserDesc')}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                              <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => removeUser(u._id)}>
                                {t('removeUser')}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    ) : (
                      <Badge className={
                        u.role === 'OWNER' ? 'bg-teal-100 text-teal-700' :
                        u.role === 'RECEPTIONIST' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-600'
                      }>
                        {u.role}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-4 mt-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">{t('currentPlanTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-teal-50 rounded-xl">
                <div>
                  <p className="text-xl font-bold text-teal-700">{tenantData?.plan} Plan</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {t('expires')} {tenantData?.planExpiresAt ? formatDate(tenantData.planExpiresAt) : '—'}
                  </p>
                </div>
                <div className="text-right">
                  <Badge className="bg-teal-600 text-white text-sm px-3 py-1">{t('active')}</Badge>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">{t('planIncluded')}</p>
                <ul className="space-y-1.5">
                  {PLAN_FEATURES[tenantData?.plan ?? 'STARTER'].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              <Separator />

              {tenantData?.plan !== 'PRO' && (
                <div className="space-y-3">
                  <p className="text-sm font-medium">{t('upgrade')}:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {tenantData?.plan === 'STARTER' && (
                      <Button className="bg-blue-600 hover:bg-blue-700">
                        Upgrade to GROWTH · ₹999/mo
                      </Button>
                    )}
                    <Button className="bg-orange-500 hover:bg-orange-600">
                      Upgrade to PRO · ₹2499/mo
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Danger Zone */}
        {isOwner && (
          <TabsContent value="danger" className="space-y-4 mt-6">
            <Card className="border-0 shadow-sm border-red-100">
              <CardHeader>
                <CardTitle className="text-base text-red-600 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  {t('dangerTitle')}
                </CardTitle>
                <CardDescription className="text-red-500">
                  {t('dangerDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 border border-red-200 rounded-xl space-y-3">
                  <div>
                    <p className="font-medium text-gray-900">{t('deleteTitle')}</p>
                    <p className="text-sm text-gray-500">
                      {t('deleteDesc')}
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger render={<button className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors" />}>
                      <Trash2 className="w-4 h-4" />
                      {t('deleteBtn')}
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t('deleteConfirmTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('deleteConfirmDesc')}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => toast.error('Contact support to delete your account')}>
                          Yes, delete everything
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
