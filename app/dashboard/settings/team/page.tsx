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
import { Plus, Trash2 } from 'lucide-react'

interface TeamUser {
  _id: string
  name: string
  email: string
  role: 'OWNER' | 'RECEPTIONIST' | 'VIEWER'
}

export default function TeamPage() {
  const { user } = useApp()
  const t = useTranslations('settings')
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<TeamUser[]>([])
  const [newUserName, setNewUserName] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserRole, setNewUserRole] = useState('RECEPTIONIST')
  const [addingUser, setAddingUser] = useState(false)
  const isOwner = user?.role === 'OWNER'

  async function loadUsers() {
    const res = await fetch('/api/dashboard/settings')
    const data = await res.json()
    if (data.success) setUsers(data.data.users)
    setLoading(false)
  }

  useEffect(() => { loadUsers() }, [])

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
      loadUsers()
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
    if (data.success) { toast.success('Role updated'); loadUsers() }
    else toast.error(data.error)
  }

  async function removeUser(userId: string) {
    const res = await fetch(`/api/dashboard/settings/users/${userId}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.success) { toast.success('User removed'); loadUsers() }
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
            <div className="flex gap-3">
              <Select value={newUserRole} onValueChange={v => v && setNewUserRole(v)}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RECEPTIONIST">Receptionist</SelectItem>
                  <SelectItem value="VIEWER">Viewer (read-only)</SelectItem>
                </SelectContent>
              </Select>
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
                <Avatar className="w-9 h-9">
                  <AvatarFallback className="bg-blue-100 text-blue-700 text-sm font-semibold">
                    {u.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 truncate">{u.name}</p>
                  <p className="text-xs text-gray-500 truncate">{u.email}</p>
                </div>
                {isOwner && u._id !== user?.id ? (
                  <div className="flex items-center gap-2">
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
                  <Badge className={
                    u.role === 'OWNER' ? 'bg-blue-100 text-blue-700' :
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
    </div>
  )
}
