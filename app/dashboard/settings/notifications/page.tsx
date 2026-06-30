'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { PageLoader } from '@/components/ui/page-loader'

export default function NotificationsPage() {
  const t = useTranslations('settings')
  const [loading, setLoading] = useState(true)
  const [reminder24h, setReminder24h] = useState(true)
  const [reminder1h, setReminder1h] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard/settings').then(r => r.json()).then(data => {
      if (data.success) {
        const n = data.data.tenant?.notifications
        setReminder24h(n?.reminder24h ?? true)
        setReminder1h(n?.reminder1h ?? true)
      }
      setLoading(false)
    })
  }, [])

  async function save() {
    const res = await fetch('/api/dashboard/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notifications: { reminder24h, reminder1h } }),
    })
    const data = await res.json()
    if (data.success) toast.success('Notification settings saved')
    else toast.error(data.error)
  }

  if (loading) return <PageLoader rows={3} />

  return (
    <div className="space-y-4">
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
          <Button className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto" onClick={save}>
            {t('saveSettings')}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
