'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { useApp } from '@/lib/context'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { formatDateTime } from '@/lib/format'
import { Megaphone, Send, Clock, CheckCircle2, AlertCircle, Lock } from 'lucide-react'

interface BroadcastRecord {
  _id: string
  message: string
  language: string
  target: string
  sentCount: number
  failedCount: number
  scheduledAt: string | null
  sentAt: string | null
  status: string
  createdAt: string
}

export default function BroadcastPage() {
  const t = useTranslations('broadcast')
  const { tenant, user } = useApp()
  const [history, setHistory] = useState<BroadcastRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [msgLang, setMsgLang] = useState<'hi' | 'en'>('hi')
  const [target, setTarget] = useState('ALL')
  const [scheduledAt, setScheduledAt] = useState('')
  const [sending, setSending] = useState(false)

  const TARGET_OPTIONS = [
    { value: 'ALL', key: t('targetAll') },
    { value: 'LAST_30', key: t('targetLast30') },
    { value: 'LAST_60', key: t('targetLast60') },
    { value: 'LAST_90', key: t('targetLast90') },
    { value: 'CANCELLED', key: t('targetCancelled') },
  ]

  const isPlanAllowed = tenant?.plan === 'GROWTH' || tenant?.plan === 'PRO'
  const canSend = user?.role !== 'VIEWER' && isPlanAllowed

  async function loadHistory() {
    const res = await fetch('/api/dashboard/broadcast')
    const data = await res.json()
    if (data.success) setHistory(data.data)
    setLoading(false)
  }

  useEffect(() => { loadHistory() }, [])

  async function handleSend() {
    if (!message.trim()) { toast.error('Please enter a message'); return }
    if (message.length > 1024) { toast.error('Message too long (max 1024 chars)'); return }

    setSending(true)
    try {
      const res = await fetch('/api/dashboard/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, language: msgLang, target, scheduledAt: scheduledAt || null }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(scheduledAt ? 'Broadcast scheduled!' : 'Broadcast sent!')
        setMessage('')
        setScheduledAt('')
        loadHistory()
      } else {
        toast.error(data.error)
      }
    } finally {
      setSending(false)
    }
  }

  // Plan gate
  if (!isPlanAllowed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 text-center space-y-4">
        <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center">
          <Lock className="w-10 h-10 text-orange-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800">{t('title')}</h2>
        <p className="text-gray-500 max-w-sm">{t('planLock')}</p>
        <Badge className="bg-orange-100 text-orange-700 text-sm px-4 py-1.5">
          {`Current Plan: ${tenant?.plan}`}
        </Badge>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <p className="text-gray-500 text-sm mt-1">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compose */}
        <div className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('compose')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Language selector */}
              <div className="space-y-2">
                <Label>{t('langLabel')}</Label>
                <Select value={msgLang} onValueChange={(v) => setMsgLang(v as 'hi' | 'en')}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hi">हिंदी</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Message */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t('messageLabel')}</Label>
                  <span className={`text-xs ${message.length > 1000 ? 'text-red-500' : 'text-gray-400'}`}>
                    {message.length}/1024
                  </span>
                </div>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={msgLang === 'hi'
                    ? 'नमस्ते! शर्मा क्लिनिक से सूचना...'
                    : t('messagePlaceholder')}
                  className="min-h-32 resize-none text-base"
                  maxLength={1024}
                />
              </div>

              {/* Target */}
              <div className="space-y-2">
                <Label>{t('targetLabel')}</Label>
                <Select value={target} onValueChange={(v) => v && setTarget(v)}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TARGET_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.key}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Schedule */}
              <div className="space-y-2">
                <Label>{t('scheduleLabel')}</Label>
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="h-10"
                />
              </div>

              {canSend && (
                <Button
                  className="w-full h-11 bg-teal-600 hover:bg-teal-700 gap-2"
                  onClick={handleSend}
                  disabled={sending || !message.trim()}
                >
                  {scheduledAt ? <Clock className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                  {sending ? t('sending') : scheduledAt ? t('scheduleBroadcast') : t('sendNow')}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        <div className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('preview')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-[#e5ddd5] rounded-2xl p-4 min-h-48">
                {message ? (
                  <div className="bg-white rounded-xl rounded-tl-none p-3 shadow-sm max-w-xs">
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{message}</p>
                    <p className="text-xs text-gray-400 text-right mt-1">
                      {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 text-sm py-10">
                    {t('previewPlaceholder')}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* History */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t('history')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-4">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : !history.length ? (
            <div className="text-center py-12 text-gray-400">
              <Megaphone className="w-12 h-12 mx-auto mb-3 text-gray-200" />
              <p>{t('noHistory')}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {history.map((b) => (
                <div key={b._id} className="p-4 flex items-start gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    b.status === 'SENT' ? 'bg-green-100' : b.status === 'SCHEDULED' ? 'bg-blue-100' : 'bg-red-100'
                  }`}>
                    {b.status === 'SENT' ? <CheckCircle2 className="w-4 h-4 text-green-600" /> :
                     b.status === 'SCHEDULED' ? <Clock className="w-4 h-4 text-blue-600" /> :
                     <AlertCircle className="w-4 h-4 text-red-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">{b.message}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span>Target: {b.target}</span>
                      {b.sentCount > 0 && <span className="text-green-600">✓ {b.sentCount} sent</span>}
                      {b.failedCount > 0 && <span className="text-red-500">✗ {b.failedCount} failed</span>}
                      <span>{b.sentAt ? formatDateTime(b.sentAt) : b.scheduledAt ? `Scheduled: ${formatDateTime(b.scheduledAt)}` : ''}</span>
                    </div>
                  </div>
                  <Badge className={
                    b.status === 'SENT' ? 'bg-green-100 text-green-700' :
                    b.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }>
                    {b.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
