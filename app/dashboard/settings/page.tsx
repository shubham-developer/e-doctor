'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { useApp } from '@/lib/context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageLoader } from '@/components/ui/page-loader'
import { Upload, X } from 'lucide-react'

export default function SettingsPage() {
  const { user, refetch } = useApp()
  const t = useTranslations('settings')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const isOwner = user?.role === 'OWNER'

  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [brandColor, setBrandColor] = useState('#0ea5e9')
  const [logoUrl, setLogoUrl] = useState('')

  useEffect(() => {
    fetch('/api/dashboard/settings').then(r => r.json()).then(data => {
      if (data.success) {
        const ten = data.data.tenant
        setName(ten.name ?? '')
        setAddress(ten.address ?? '')
        setBrandColor(ten.brandColor ?? '#0ea5e9')
        setLogoUrl(ten.logoUrl ?? '')
      }
      setLoading(false)
    })
  }, [])

  async function saveProfile() {
    setSaving(true)
    const res = await fetch('/api/dashboard/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, address, brandColor, logoUrl: logoUrl || undefined }),
    })
    const data = await res.json()
    if (data.success) { toast.success('Profile updated'); refetch() }
    else toast.error(data.error)
    setSaving(false)
  }

  if (loading) return <PageLoader rows={4} />

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <p className="text-gray-500 text-sm mt-1">{t('subtitle')}</p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">{t('clinicNameLabel')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Logo */}
          <div className="space-y-2">
            <Label>Clinic Logo</Label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
                {logoUrl ? (
                  <img src={logoUrl} alt="Clinic logo" className="w-full h-full object-contain" />
                ) : (
                  <span className="text-2xl font-bold text-gray-300 select-none">
                    {name ? name.charAt(0).toUpperCase() : '?'}
                  </span>
                )}
              </div>
              <div className="space-y-2">
                <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border border-gray-200 bg-white hover:bg-gray-50 transition-colors ${isOwner ? 'cursor-pointer' : 'opacity-50 pointer-events-none'}`}>
                  <Upload className="w-4 h-4" />
                  Upload Logo
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={!isOwner}
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2 MB'); return }
                      const reader = new FileReader()
                      reader.onload = ev => setLogoUrl(ev.target?.result as string)
                      reader.readAsDataURL(file)
                    }}
                  />
                </label>
                {logoUrl && isOwner && (
                  <button
                    onClick={() => setLogoUrl('')}
                    className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" /> Remove logo
                  </button>
                )}
                <p className="text-xs text-gray-400">PNG, JPG or SVG · max 2 MB</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('clinicNameLabel')}</Label>
            <Input value={name} onChange={e => setName(e.target.value)} className="h-11" disabled={!isOwner} />
          </div>
          <div className="space-y-2">
            <Label>{t('addressLabel')}</Label>
            <Input value={address} onChange={e => setAddress(e.target.value)} placeholder={t('addressPlaceholder')} className="h-11" disabled={!isOwner} />
          </div>
          <div className="space-y-2">
            <Label>{t('brandColorLabel')}</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={brandColor}
                onChange={e => setBrandColor(e.target.value)}
                className="w-12 h-11 rounded-lg border border-gray-200 cursor-pointer"
                disabled={!isOwner}
              />
              <Input value={brandColor} onChange={e => setBrandColor(e.target.value)} className="h-11 font-mono" disabled={!isOwner} />
            </div>
          </div>
          {isOwner && (
            <Button className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto" onClick={saveProfile} disabled={saving}>
              {saving ? t('saving') : t('save')}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
