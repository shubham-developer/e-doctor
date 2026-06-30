'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

export interface PatientFormData {
  name: string
  guardianName?: string
  gender?: string
  dateOfBirth?: string
  age: number
  ageMonths: number
  ageDays: number
  bloodGroup?: string
  maritalStatus?: string
  phone?: string
  email?: string
  address?: string
  remarks?: string
  allergies?: string
  tpa?: string
  tpaId?: string
  tpaValidity?: string
  nationalId?: string
  alternateNumber?: string
  languagePref: 'hi' | 'en'
}

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']
const TPA_OPTIONS  = ['Star Health', 'ICICI Lombard', 'National Insurance', 'New India Assurance', 'United India', 'CGHS', 'ESIC', 'Other']

export function PatientForm({
  initial,
  onSave,
  onClose,
}: {
  initial?: Partial<PatientFormData>
  onSave: (data: PatientFormData) => Promise<void>
  onClose: () => void
}) {
  const t = useTranslations('patients')
  const [name, setName]                     = useState(initial?.name ?? '')
  const [guardianName, setGuardianName]     = useState(initial?.guardianName ?? '')
  const [gender, setGender]                 = useState(initial?.gender ?? '')
  const [dateOfBirth, setDateOfBirth]       = useState(initial?.dateOfBirth ?? '')
  const [age, setAge]                       = useState(String(initial?.age || ''))
  const [ageMonths, setAgeMonths]           = useState(String(initial?.ageMonths || ''))
  const [ageDays, setAgeDays]               = useState(String(initial?.ageDays || ''))
  const [bloodGroup, setBloodGroup]         = useState(initial?.bloodGroup ?? '')
  const [maritalStatus, setMaritalStatus]   = useState(initial?.maritalStatus ?? '')
  const [phone, setPhone]                   = useState(initial?.phone ?? '')
  const [email, setEmail]                   = useState(initial?.email ?? '')
  const [address, setAddress]               = useState(initial?.address ?? '')
  const [remarks, setRemarks]               = useState(initial?.remarks ?? '')
  const [allergies, setAllergies]           = useState(initial?.allergies ?? '')
  const [tpa, setTpa]                       = useState(initial?.tpa ?? '')
  const [tpaId, setTpaId]                   = useState(initial?.tpaId ?? '')
  const [tpaValidity, setTpaValidity]       = useState(initial?.tpaValidity ?? '')
  const [nationalId, setNationalId]         = useState(initial?.nationalId ?? '')
  const [alternateNumber, setAlternateNumber] = useState(initial?.alternateNumber ?? '')
  const [languagePref, setLanguagePref]     = useState<'hi' | 'en'>(initial?.languagePref ?? 'hi')
  const [saving, setSaving]                 = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { toast.error(t('nameRequired')); return }
    setSaving(true)
    try {
      await onSave({
        name, guardianName, gender, dateOfBirth,
        age: Number(age) || 0, ageMonths: Number(ageMonths) || 0, ageDays: Number(ageDays) || 0,
        bloodGroup, maritalStatus, phone, email, address,
        remarks, allergies, tpa, tpaId, tpaValidity,
        nationalId, alternateNumber, languagePref,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const lbl = 'block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5'
  const inp = 'h-9 text-sm w-full'

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-0">
      <div className="overflow-y-auto max-h-[62vh] px-0.5 pb-2">
        <div className="grid grid-cols-12 gap-x-3 gap-y-4">

          {/* Patient info */}
          <div className="col-span-6">
            <label className={lbl}>{t('nameLabel')} *</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder={t('namePlaceholder')} className={inp} autoFocus />
          </div>
          <div className="col-span-6">
            <label className={lbl}>{t('guardianNameLabel')}</label>
            <Input value={guardianName} onChange={e => setGuardianName(e.target.value)} className={inp} />
          </div>

          {/* Demographics */}
          <div className="col-span-2">
            <label className={lbl}>{t('genderLabel')}</label>
            <Select value={gender} onValueChange={v => setGender(v ?? '')}>
              <SelectTrigger className={inp}><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">{t('genderMale')}</SelectItem>
                <SelectItem value="Female">{t('genderFemale')}</SelectItem>
                <SelectItem value="Other">{t('genderOther')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <label className={lbl}>{t('dobLabel')}</label>
            <Input value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} placeholder="YYYY-MM-DD" className={inp} />
          </div>
          <div className="col-span-4">
            <label className={lbl}>{t('ageLabel')} *</label>
            <div className="flex gap-1.5">
              <Input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder={t('yearPlaceholder')} min={0} max={120} className={inp} />
              <Input type="number" value={ageMonths} onChange={e => setAgeMonths(e.target.value)} placeholder={t('monthPlaceholder')} min={0} max={11} className={inp} />
              <Input type="number" value={ageDays} onChange={e => setAgeDays(e.target.value)} placeholder={t('dayPlaceholder')} min={0} max={31} className={inp} />
            </div>
          </div>
          <div className="col-span-2">
            <label className={lbl}>{t('bloodGroupLabel')}</label>
            <Select value={bloodGroup} onValueChange={v => setBloodGroup(v ?? '')}>
              <SelectTrigger className={inp}><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {BLOOD_GROUPS.map(bg => <SelectItem key={bg} value={bg}>{bg}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <label className={lbl}>{t('maritalStatusLabel')}</label>
            <Select value={maritalStatus} onValueChange={v => setMaritalStatus(v ?? '')}>
              <SelectTrigger className={inp}><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Single">Single</SelectItem>
                <SelectItem value="Married">Married</SelectItem>
                <SelectItem value="Divorced">Divorced</SelectItem>
                <SelectItem value="Widowed">Widowed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Contact */}
          <div className="col-span-12 border-t border-gray-100" />
          <div className="col-span-4">
            <label className={lbl}>{t('phoneLabel')}</label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} className={inp} />
          </div>
          <div className="col-span-4">
            <label className={lbl}>{t('emailLabel')}</label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inp} />
          </div>
          <div className="col-span-4">
            <label className={lbl}>{t('addressLabel')}</label>
            <Input value={address} onChange={e => setAddress(e.target.value)} className={inp} />
          </div>

          {/* Medical */}
          <div className="col-span-12 border-t border-gray-100" />
          <div className="col-span-6">
            <label className={lbl}>{t('remarksLabel')}</label>
            <Textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={2} className="resize-none text-sm" />
          </div>
          <div className="col-span-6">
            <label className={lbl}>{t('allergiesLabel')}</label>
            <Textarea value={allergies} onChange={e => setAllergies(e.target.value)} rows={2} className="resize-none text-sm" />
          </div>

          {/* Insurance */}
          <div className="col-span-12 border-t border-gray-100" />
          <div className="col-span-4">
            <label className={lbl}>{t('tpaLabel')}</label>
            <Select value={tpa} onValueChange={v => setTpa(v ?? '')}>
              <SelectTrigger className={inp}><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="None">None</SelectItem>
                {TPA_OPTIONS.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-4">
            <label className={lbl}>{t('tpaIdLabel')}</label>
            <Input value={tpaId} onChange={e => setTpaId(e.target.value)} className={inp} />
          </div>
          <div className="col-span-4">
            <label className={lbl}>{t('tpaValidityLabel')}</label>
            <Input value={tpaValidity} onChange={e => setTpaValidity(e.target.value)} placeholder="YYYY-MM-DD" className={inp} />
          </div>

          {/* Other */}
          <div className="col-span-6">
            <label className={lbl}>{t('nationalIdLabel')}</label>
            <Input value={nationalId} onChange={e => setNationalId(e.target.value)} className={inp} />
          </div>
          <div className="col-span-6" />

          <div className="col-span-6">
            <label className={lbl}>{t('alternateNumberLabel')}</label>
            <Input value={alternateNumber} onChange={e => setAlternateNumber(e.target.value)} className={inp} />
          </div>
          <div className="col-span-6">
            <label className={lbl}>{t('langLabel')}</label>
            <Select value={languagePref} onValueChange={v => setLanguagePref((v ?? 'hi') as 'hi' | 'en')}>
              <SelectTrigger className={inp}>
                <SelectValue>{languagePref === 'hi' ? 'हिंदी' : 'English'}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hi">हिंदी</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>

        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t border-gray-100 mt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onClose}>{t('cancel')}</Button>
        <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={saving}>
          {saving ? t('saving') : t('save')}
        </Button>
      </div>
    </form>
  )
}
