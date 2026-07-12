'use client'

import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useApiQuery } from '@/lib/useApiQuery'
import { useApp } from '@/lib/context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageLoader } from '@/components/ui/page-loader'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ImageIcon } from 'lucide-react'

const LANGUAGES = ['English', 'Hindi', 'Bengali', 'Tamil', 'Telugu', 'Marathi', 'Gujarati', 'Kannada', 'Malayalam']

const DATE_FORMATS = ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY/MM/DD', 'DD-MM-YYYY', 'MM-DD-YYYY']

const TIME_ZONES = [
  '(GMT+05:30) Asia, Kolkata',
  '(GMT+00:00) UTC',
  '(GMT-05:00) America, New_York',
  '(GMT-08:00) America, Los_Angeles',
  '(GMT+01:00) Europe, London',
  '(GMT+05:00) Asia, Karachi',
  '(GMT+06:00) Asia, Dhaka',
  '(GMT+08:00) Asia, Singapore',
]

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD', 'CAD']

const TIME_FORMATS = ['12 Hour', '24 Hour']

function FieldRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-x-8 gap-y-4 py-4 border-b border-gray-100 last:border-0">
      {children}
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4">
      <span className="w-44 shrink-0 text-sm font-medium text-gray-700">
        {label}{required && <span className="text-danger-500 ml-0.5">*</span>}
      </span>
      <div className="flex-1">{children}</div>
    </div>
  )
}

function LogoUploader({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  disabled: boolean
}) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div className="flex items-center gap-4">
      <span className="w-44 shrink-0 text-sm font-medium text-gray-700">
        {label}<span className="text-danger-500 ml-0.5">*</span>
      </span>
      <div className="flex items-center gap-3">
        <div className="w-12 h-10 border border-gray-200 rounded bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
          {value ? (
            <img src={value} alt={label} className="w-full h-full object-contain" />
          ) : (
            <span className="text-gray-300 text-xs font-bold">?</span>
          )}
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => ref.current?.click()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ImageIcon className="w-4 h-4" />
          {label.includes('Small') ? 'Edit Small Logo' : 'Edit Logo'}
        </button>
        <input
          ref={ref}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0]
            if (!file) return
            if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2 MB'); return }
            const reader = new FileReader()
            reader.onload = ev => onChange(ev.target?.result as string)
            reader.readAsDataURL(file)
            e.target.value = ''
          }}
        />
      </div>
    </div>
  )
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="pt-2 pb-1">
      <h3 className="text-base font-semibold text-gray-800">{title}</h3>
    </div>
  )
}

export default function SettingsPage() {
  const { user, refetch } = useApp()
  const [saving, setSaving] = useState(false)
  const queryClient = useQueryClient()
  const isOwner = user?.role === 'OWNER'
  const [hospitalCode, setHospitalCode] = useState('')


  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [smallLogoUrl, setSmallLogoUrl] = useState('')

  const [language, setLanguage] = useState('English')
  const [dateFormat, setDateFormat] = useState('MM/DD/YYYY')
  const [timeZone, setTimeZone] = useState('(GMT+05:30) Asia, Kolkata')

  const [currency, setCurrency] = useState('INR')
  const [currencySymbol, setCurrencySymbol] = useState('₹')
  const [creditLimit, setCreditLimit] = useState('')
  const [timeFormat, setTimeFormat] = useState('12 Hour')
  const [opdRevisitDays, setOpdRevisitDays] = useState('0')
  const [opdFreeRevisits, setOpdFreeRevisits] = useState('0')

  const { data: settingsData, isPending: loading } = useApiQuery<{
    tenant: Record<string, unknown> & { creditLimit?: number }
  }>(['tenant-settings'], '/api/dashboard/settings')

  // Seed the form once settings arrive
  useEffect(() => {
    const ten = settingsData?.tenant as
      | (Record<string, string | undefined> & { creditLimit?: number })
      | undefined
    if (!ten) return
    setHospitalCode(ten.hospitalCode ?? '')
    setName(ten.name ?? '')
    setPhone(ten.phone ?? '')
    setEmail(ten.email ?? '')
    setAddress(ten.address ?? '')
    setLogoUrl(ten.logoUrl ?? '')
    setSmallLogoUrl(ten.smallLogoUrl ?? '')
    setLanguage(ten.language ?? 'English')
    setDateFormat(ten.dateFormat ?? 'MM/DD/YYYY')
    setTimeZone(ten.timeZone ?? '(GMT+05:30) Asia, Kolkata')
    setCurrency(ten.currency ?? 'INR')
    setCurrencySymbol(ten.currencySymbol ?? '₹')
    setCreditLimit(ten.creditLimit != null ? String(ten.creditLimit) : '0')
    setTimeFormat(ten.timeFormat ?? '12 Hour')
    setOpdRevisitDays(ten.opdRevisitDays != null ? String(ten.opdRevisitDays) : '0')
    setOpdFreeRevisits(ten.opdFreeRevisits != null ? String(ten.opdFreeRevisits) : '0')
  }, [settingsData])

  async function handleSave() {
    setSaving(true)
    const res = await fetch('/api/dashboard/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, hospitalCode, phone, email, address,
        logoUrl: logoUrl || undefined,
        smallLogoUrl: smallLogoUrl || undefined,
        language, dateFormat, timeZone,
        currency, currencySymbol,
        creditLimit: Number(creditLimit) || 0,
        timeFormat,
        opdRevisitDays: Number(opdRevisitDays) || 0,
        opdFreeRevisits: Number(opdFreeRevisits) || 0,
      }),
    })
    const data = await res.json()
    if (data.success) {
      toast.success('Settings saved')
      queryClient.invalidateQueries({ queryKey: ['tenant-settings'] })
      refetch()
    } else toast.error(data.error ?? 'Failed to save')
    setSaving(false)
  }

  if (loading) return <PageLoader rows={6} />

  const inputCls = 'h-9 text-sm'
  const disabled = !isOwner

  return (
    <div className="space-y-0 bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* General Setting */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-800">General Setting</h2>
      </div>

      <div className="px-6 py-2">
        <FieldRow>
          <Field label="Hospital Name" required>
            <Input value={name} onChange={e => setName(e.target.value)} className={inputCls} disabled={disabled} />
          </Field>
          <Field label="Hospital Code">
            <Input value={hospitalCode} onChange={e => setHospitalCode(e.target.value)} className={inputCls} disabled={disabled} />
          </Field>
        </FieldRow>

        <FieldRow>
          <div className="col-span-2">
            <Field label="Address" required>
              <Input value={address} onChange={e => setAddress(e.target.value)} className={inputCls} disabled={disabled} />
            </Field>
          </div>
        </FieldRow>

        <FieldRow>
          <Field label="Phone" required>
            <Input value={phone} onChange={e => setPhone(e.target.value)} className={inputCls} disabled={disabled} />
          </Field>
          <Field label="Email" required>
            <Input value={email} onChange={e => setEmail(e.target.value)} type="email" className={inputCls} disabled={disabled} />
          </Field>
        </FieldRow>

        <div className="grid grid-cols-2 gap-x-8 py-4 border-b border-gray-100">
          <LogoUploader label="Hospital Logo" value={logoUrl} onChange={setLogoUrl} disabled={disabled} />
          <LogoUploader label="Hospital Small Logo" value={smallLogoUrl} onChange={setSmallLogoUrl} disabled={disabled} />
        </div>

        {/* Language */}
        <SectionHeader title="Language" />
        <FieldRow>
          <Field label="Language" required>
            <Select value={language} onValueChange={v => v && setLanguage(v)} disabled={disabled}>
              <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
              <SelectContent>
                {LANGUAGES.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <div />
        </FieldRow>

        {/* Date Time */}
        <SectionHeader title="Date Time" />
        <FieldRow>
          <Field label="Date Format" required>
            <Select value={dateFormat} onValueChange={v => v && setDateFormat(v)} disabled={disabled}>
              <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
              <SelectContent>
                {DATE_FORMATS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Time Zone" required>
            <Select value={timeZone} onValueChange={v => v && setTimeZone(v)} disabled={disabled}>
              <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIME_ZONES.map(tz => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </FieldRow>

        {/* Currency */}
        <SectionHeader title="Currency" />
        <FieldRow>
          <Field label="Currency" required>
            <Select value={currency} onValueChange={v => v && setCurrency(v)} disabled={disabled}>
              <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
              <SelectContent>
                {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Currency Symbol" required>
            <Input value={currencySymbol} onChange={e => setCurrencySymbol(e.target.value)} className={inputCls} disabled={disabled} />
          </Field>
        </FieldRow>
        <FieldRow>
          <Field label="Credit Limit" required>
            <Input value={creditLimit} onChange={e => setCreditLimit(e.target.value)} type="number" min="0" className={inputCls} disabled={disabled} />
          </Field>
          <Field label="Time Format" required>
            <Select value={timeFormat} onValueChange={v => v && setTimeFormat(v)} disabled={disabled}>
              <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIME_FORMATS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </FieldRow>
      </div>

      {/* OPD Settings */}
      <div className="px-6 py-4 border-t border-gray-200">
        <h2 className="text-sm font-semibold text-gray-800">OPD Settings</h2>
      </div>
      <div className="px-6 py-2">
        <FieldRow>
          <Field label="Revisit Window (days)">
            <div className="flex items-center gap-2">
              <Input
                value={opdRevisitDays}
                onChange={e => setOpdRevisitDays(e.target.value)}
                type="number"
                min="0"
                max="30"
                className={inputCls + ' w-24'}
                disabled={disabled}
                placeholder="0"
              />
              <span className="text-xs text-gray-500">
                {Number(opdRevisitDays) > 0 ? `Days to consider a returning patient` : 'Set to 0 to disable'}
              </span>
            </div>
          </Field>
          <Field label="Max Free Revisits (0 = unlimited)">
            <div className="flex items-center gap-2">
              <Input
                value={opdFreeRevisits}
                onChange={e => setOpdFreeRevisits(e.target.value)}
                type="number"
                min="0"
                max="10"
                className={inputCls + ' w-24'}
                disabled={disabled || Number(opdRevisitDays) === 0}
                placeholder="0"
              />
              <span className="text-xs text-gray-500">
                {Number(opdRevisitDays) > 0
                  ? Number(opdFreeRevisits) === 0
                    ? `All returns within ${opdRevisitDays} days are free (unlimited)`
                    : `Up to ${opdFreeRevisits} free return visit${Number(opdFreeRevisits) !== 1 ? 's' : ''} within ${opdRevisitDays} days`
                  : 'Enable revisit window first'}
              </span>
            </div>
          </Field>
        </FieldRow>
      </div>

      {isOwner && (
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="bg-primary-600 hover:bg-primary-700 px-8">
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      )}
    </div>
  )
}
