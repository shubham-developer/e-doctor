'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { useApp } from '@/lib/context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageLoader } from '@/components/ui/page-loader'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Plus, Trash2, Shield } from 'lucide-react'

interface CustomRole { _id: string; name: string }

interface TeamUser {
  _id: string
  name: string
  email: string
  role: 'OWNER' | 'RECEPTIONIST' | 'VIEWER'
  customRoleId?: CustomRole | null
}

const ROLE_BADGE: Record<string, string> = {
  OWNER:        'bg-blue-100 text-blue-700',
  RECEPTIONIST: 'bg-indigo-100 text-indigo-700',
  VIEWER:       'bg-gray-100 text-gray-600',
}

export default function TeamPage() {
  const { user } = useApp()
  const t = useTranslations('settings')
  const [loading, setLoading]           = useState(true)
  const [users, setUsers]               = useState<TeamUser[]>([])
  const [customRoles, setCustomRoles]   = useState<CustomRole[]>([])
  const [newUserName, setNewUserName]   = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserRole, setNewUserRole]   = useState('RECEPTIONIST')
  const [newCustomRole, setNewCustomRole] = useState('')
  const [addingUser, setAddingUser]     = useState(false)
  const isOwner = user?.role === 'OWNER'

  async function loadData() {
    const [usersRes, rolesRes] = await Promise.all([
      fetch('/api/dashboard/settings'),
      fetch('/api/dashboard/settings/roles'),
    ])
    const usersData = await usersRes.json()
    const rolesData = await rolesRes.json()
    if (usersData.success) setUsers(usersData.data.users)
    if (rolesData.success) setCustomRoles(rolesData.data)
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  async function addUser() {
    if (!newUserName || !newUserEmail) { toast.error('Name and email required'); return }
    setAddingUser(true)
    const res  = await fetch('/api/dashboard/settings/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newUserName,
        email: newUserEmail,
        userRole: newUserRole,
        customRoleId: newCustomRole || undefined,
      }),
    })
    const data = await res.json()
    if (data.success) {
      toast.success(`User added! Temp password: ${data.data.tempPassword}`, { duration: 10000 })
      setNewUserName(''); setNewUserEmail(''); setNewCustomRole('')
      loadData()
    } else {
      toast.error(data.error)
    }
    setAddingUser(false)
  }

  async function changeRole(userId: string, role: string) {
    const res  = await fetch(`/api/dashboard/settings/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    const data = await res.json()
    if (data.success) { toast.success('Role updated'); loadData() }
    else toast.error(data.error)
  }

  async function changeCustomRole(userId: string, customRoleId: string) {
    const res  = await fetch(`/api/dashboard/settings/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customRoleId: customRoleId || '' }),
    })
    const data = await res.json()
    if (data.success) { toast.success('Custom role updated'); loadData() }
    else toast.error(data.error)
  }

  async function removeUser(userId: string) {
    const res  = await fetch(`/api/dashboard/settings/users/${userId}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.success) { toast.success('User removed'); loadData() }
    else toast.error(data.error)
  }

  if (loading) return <PageLoader rows={4} />

  return (
    <div className="space-y-4">
      {isOwner && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">{t('addMemberTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input placeholder="Full name" value={newUserName} onChange={e => setNewUserName(e.target.value)} className="h-10" />
              <Input type="email" placeholder="email@clinic.com" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} className="h-10" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select value={newUserRole} onValueChange={v => v && setNewUserRole(v)}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RECEPTIONIST">Receptionist</SelectItem>
                  <SelectItem value="VIEWER">Viewer (read-only)</SelectItem>
                </SelectContent>
              </Select>
              {customRoles.length > 0 && (
                <Select value={newCustomRole} onValueChange={v => setNewCustomRole(!v || v === '__none__' ? '' : v)}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Custom role (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No custom role</SelectItem>
                    {customRoles.map(r => (
                      <SelectItem key={r._id} value={r._id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="flex gap-3">
              <Button className="bg-blue-600 hover:bg-blue-700 gap-2" onClick={addUser} disabled={addingUser}>
                <Plus className="w-4 h-4" />
                {t('addMember')}
              </Button>
            </div>
            <p className="text-xs text-gray-500">{t('addMemberNote')}</p>
          </CardContent>
        </Card>
      )}

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">{t('teamMembersTitle')} ({users.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-50">
            {users.map(u => (
              <div key={u._id} className="flex items-center gap-3 p-4">
                <Avatar className="w-9 h-9 shrink-0">
                  <AvatarFallback className="bg-blue-100 text-blue-700 text-sm font-semibold">
                    {u.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 truncate">{u.name}</p>
                  <p className="text-xs text-gray-500 truncate">{u.email}</p>
                  {u.customRoleId && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-purple-600 font-medium mt-0.5">
                      <Shield className="w-2.5 h-2.5" />
                      {u.customRoleId.name}
                    </span>
                  )}
                </div>

                {isOwner && u._id !== user?.id ? (
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {/* System role */}
                    <Select value={u.role} onValueChange={r => r && changeRole(u._id, r)}>
                      <SelectTrigger className="h-8 w-36 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OWNER">Owner</SelectItem>
                        <SelectItem value="RECEPTIONIST">Receptionist</SelectItem>
                        <SelectItem value="VIEWER">Viewer</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Custom role */}
                    {customRoles.length > 0 && (
                      <Select
                        value={u.customRoleId?._id ?? '__none__'}
                        onValueChange={v => changeCustomRole(u._id, !v || v === '__none__' ? '' : v)}
                      >
                        <SelectTrigger className="h-8 w-40 text-xs">
                          <SelectValue placeholder="Custom role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">No custom role</SelectItem>
                          {customRoles.map(r => (
                            <SelectItem key={r._id} value={r._id}>{r.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    <AlertDialog>
                      <AlertDialogTrigger render={<button className="w-8 h-8 inline-flex items-center justify-center rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors" />}>
                        <Trash2 className="w-4 h-4" />
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t('removeUserTitle', { name: u.name })}</AlertDialogTitle>
                          <AlertDialogDescription>{t('removeUserDesc')}</AlertDialogDescription>
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
                  <div className="flex items-center gap-1.5">
                    <Badge className={`${ROLE_BADGE[u.role] ?? ROLE_BADGE.VIEWER} border-0`}>
                      {u.role}
                    </Badge>
                    {u.customRoleId && (
                      <Badge className="bg-purple-100 text-purple-700 border-0 gap-1">
                        <Shield className="w-2.5 h-2.5" />
                        {u.customRoleId.name}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
