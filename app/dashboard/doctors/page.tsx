'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { useApp } from '@/lib/context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { formatCurrency } from '@/lib/format'
import { Plus, Pencil, Languages, IndianRupee, Stethoscope } from 'lucide-react'

interface Doctor {
  _id: string
  name: string
  specialization: string
  photoUrl: string
  languages: string[]
  consultationFee: number
  isActive: boolean
}

const LANGUAGES = ['Hindi', 'English', 'Bundeli', 'Awadhi', 'Bhojpuri', 'Marathi', 'Gujarati']

function DoctorForm({
  initial,
  onSave,
  onClose,
}: {
  initial?: Partial<Doctor>
  onSave: (data: Partial<Doctor>) => Promise<void>
  onClose: () => void
}) {
  const t = useTranslations('doctors')
  const [name, setName] = useState(initial?.name ?? '')
  const [specialization, setSpecialization] = useState(initial?.specialization ?? '')
  const [fee, setFee] = useState(String(initial?.consultationFee ?? ''))
  const [languages, setLanguages] = useState<string[]>(initial?.languages ?? ['Hindi', 'English'])
  const [saving, setSaving] = useState(false)

  function toggleLang(l: string) {
    setLanguages((prev) => prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !specialization.trim()) {
      toast.error('Name and specialization are required')
      return
    }
    setSaving(true)
    try {
      await onSave({ name, specialization, consultationFee: Number(fee), languages })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="dname">{t('nameLabel')} *</Label>
        <Input id="dname" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('namePlaceholder')} className="h-11" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="spec">{t('specLabel')} *</Label>
        <Input id="spec" value={specialization} onChange={(e) => setSpecialization(e.target.value)} placeholder={t('specPlaceholder')} className="h-11" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="fee">{t('feeLabel')}</Label>
        <Input id="fee" type="number" value={fee} onChange={(e) => setFee(e.target.value)} placeholder="300" className="h-11" />
      </div>
      <div className="space-y-2">
        <Label>{t('langLabel')}</Label>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => toggleLang(l)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                languages.includes(l)
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-teal-400'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onClose}>{t('cancel')}</Button>
        <Button type="submit" className="flex-1 bg-teal-600 hover:bg-teal-700" disabled={saving}>
          {saving ? t('saving') : t('save')}
        </Button>
      </div>
    </form>
  )
}

export default function DoctorsPage() {
  const { user } = useApp()
  const t = useTranslations('doctors')
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [editDoctor, setEditDoctor] = useState<Doctor | null>(null)
  const canEdit = user?.role !== 'VIEWER'

  async function loadDoctors() {
    const res = await fetch('/api/dashboard/doctors')
    const data = await res.json()
    if (data.success) setDoctors(data.data)
    setLoading(false)
  }

  useEffect(() => { loadDoctors() }, [])

  async function handleAdd(body: Partial<Doctor>) {
    const res = await fetch('/api/dashboard/doctors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (data.success) { toast.success('Doctor added successfully'); loadDoctors() }
    else toast.error(data.error)
  }

  async function handleEdit(body: Partial<Doctor>) {
    if (!editDoctor) return
    const res = await fetch(`/api/dashboard/doctors/${editDoctor._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (data.success) { toast.success('Doctor updated'); loadDoctors() }
    else toast.error(data.error)
  }

  async function toggleActive(doctor: Doctor) {
    const res = await fetch(`/api/dashboard/doctors/${doctor._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !doctor.isActive }),
    })
    const data = await res.json()
    if (data.success) { toast.success(doctor.isActive ? 'Doctor deactivated' : 'Doctor activated'); loadDoctors() }
    else toast.error(data.error)
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-500 text-sm mt-1">{t('subtitle')}</p>
        </div>
        {canEdit && (
          <>
            <Button className="bg-teal-600 hover:bg-teal-700 gap-2" onClick={() => setAddOpen(true)}>
              <Plus className="w-4 h-4" />
              {t('addDoctor')}
            </Button>
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{t('addNew')}</DialogTitle>
                </DialogHeader>
                <DoctorForm onSave={handleAdd} onClose={() => setAddOpen(false)} />
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className="p-5 flex gap-4">
                <Skeleton className="w-16 h-16 rounded-2xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-36" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !doctors.length ? (
        <div className="text-center py-20">
          <Stethoscope className="w-16 h-16 mx-auto text-gray-200 mb-4" />
          <p className="text-xl font-semibold text-gray-400">{t('noData')}</p>
          <p className="text-gray-400 text-sm mt-2">{t('noDataDesc')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {doctors.map((doctor) => (
            <Card key={doctor._id} className={`border-0 shadow-sm transition-opacity ${doctor.isActive ? '' : 'opacity-60'}`}>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <Avatar className="w-14 h-14 rounded-2xl">
                    <AvatarFallback className="rounded-2xl bg-teal-100 text-teal-700 text-lg font-bold">
                      {doctor.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-gray-900 leading-tight">{doctor.name}</h3>
                        <p className="text-sm text-gray-500 mt-0.5">{doctor.specialization}</p>
                      </div>
                      {canEdit && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => setEditDoctor(doctor)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <Switch checked={doctor.isActive} onCheckedChange={() => toggleActive(doctor)} />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-3">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <IndianRupee className="w-3.5 h-3.5 text-green-600" />
                        {formatCurrency(doctor.consultationFee)}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Languages className="w-3.5 h-3.5 text-blue-600" />
                        {doctor.languages.join(', ')}
                      </div>
                    </div>
                    <div className="mt-2">
                      <Badge className={doctor.isActive ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}>
                        {doctor.isActive ? t('active') : t('inactive')}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editDoctor} onOpenChange={(o) => !o && setEditDoctor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('editTitle')}</DialogTitle>
          </DialogHeader>
          {editDoctor && (
            <DoctorForm initial={editDoctor} onSave={handleEdit} onClose={() => setEditDoctor(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
