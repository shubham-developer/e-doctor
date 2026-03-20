'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useApp } from '@/lib/context'
import { formatTime, formatDate, todayString } from '@/lib/format'
import { printWalkInToken, printPatientSlip } from './WalkInTokenSlip'

interface Doctor {
  _id: string
  name: string
  specialization: string
  isActive: boolean
}

interface Slot {
  _id: string
  startTime: string
  endTime: string
  isBooked: boolean
  isBlocked: boolean
}

interface PatientLookup {
  found: boolean
  name?: string
  age?: number
  lastVisit?: string
  lastDoctor?: string
}

interface WalkInModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (appointment: unknown) => void
}

export function WalkInModal({ open, onOpenChange, onSuccess }: WalkInModalProps) {
  const { tenant } = useApp()

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [age, setAge] = useState('')
  const [symptoms, setSymptoms] = useState('')
  const [doctorId, setDoctorId] = useState('')
  const [slotId, setSlotId] = useState('')
  const [assignAnyway, setAssignAnyway] = useState(false)

  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [slots, setSlots] = useState<Slot[]>([])
  const [lookupResult, setLookupResult] = useState<PatientLookup | null>(null)
  const [lookingUp, setLookingUp] = useState(false)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      setName('')
      setPhone('')
      setAge('')
      setSymptoms('')
      setDoctorId('')
      setSlotId('')
      setAssignAnyway(false)
      setLookupResult(null)
      setSlots([])
    }
  }, [open])

  // Load active doctors
  useEffect(() => {
    if (!open) return
    fetch('/api/dashboard/doctors')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setDoctors(d.data.filter((doc: Doctor) => doc.isActive))
      })
  }, [open])

  // Load today's available slots when doctor changes
  useEffect(() => {
    if (!doctorId) {
      setSlots([])
      setSlotId('')
      return
    }
    setLoadingSlots(true)
    const today = todayString()
    fetch(`/api/dashboard/slots?doctorId=${doctorId}&startDate=${today}&endDate=${today}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setSlots(d.data.filter((s: Slot) => !s.isBooked && !s.isBlocked))
        }
        setLoadingSlots(false)
      })
  }, [doctorId])

  // Phone lookup after 10 digits
  const lookupPhone = useCallback(async (num: string) => {
    setLookingUp(true)
    const res = await fetch(`/api/dashboard/reception/walkin?phone=${num}`)
    const data = await res.json()
    if (data.success) {
      setLookupResult(data.data)
      if (data.data.found) {
        setName(data.data.name ?? '')
        setAge(String(data.data.age ?? ''))
      }
    }
    setLookingUp(false)
  }, [])

  function handlePhoneChange(val: string) {
    const digits = val.replace(/\D/g, '').slice(0, 10)
    setPhone(digits)
    if (digits.length === 10) {
      lookupPhone(digits)
    } else {
      setLookupResult(null)
    }
  }

  async function handleSubmit() {
    if (!name.trim()) return toast.error('Patient name is required')
    if (!age) return toast.error('Age is required')
    if (!symptoms.trim()) return toast.error('Symptoms are required')
    if (!doctorId) return toast.error('Please select a doctor')
    if (!slotId && !assignAnyway) return toast.error('Select a slot or check "Assign Anyway"')

    setSubmitting(true)
    const res = await fetch('/api/dashboard/reception/walkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        phone: phone || undefined,
        age: Number(age),
        symptoms: symptoms.trim(),
        doctorId,
        slotId: slotId || null,
      }),
    })
    const data = await res.json()
    setSubmitting(false)

    if (!data.success) {
      toast.error(data.error || 'Failed to add walk-in')
      return
    }

    const result = data.data
    toast.success(`Walk-in added! Token #${result.tokenNumber} assigned ✅`)
    onSuccess(result.appointment)
    onOpenChange(false)

    // Auto-print patient info slip
    printPatientSlip({
      tokenNumber: result.tokenNumber,
      patientName: result.patient.name,
      patientAge: result.patient.age,
      patientPhone: result.patient.phone,
      doctorName: result.doctor.name,
      doctorSpecialization: result.doctor.specialization,
      slotTime: result.slot?.startTime ? formatTime(result.slot.startTime) : undefined,
      symptoms: symptoms.trim(),
      clinicName: tenant?.name ?? 'Clinic',
      date: formatDate(new Date()),
    })

    // Also offer token slip via toast action
    toast('Print token slip?', {
      action: {
        label: 'Print',
        onClick: () =>
          printWalkInToken({
            tokenNumber: result.tokenNumber,
            patientName: result.patient.name,
            doctorName: result.doctor.name,
            slotTime: result.slot?.startTime ? formatTime(result.slot.startTime) : undefined,
            clinicName: tenant?.name ?? 'Clinic',
            date: formatDate(new Date()),
          }),
      },
      duration: 8000,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Add Walk-in Patient</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Phone */}
          <div className="space-y-1.5">
            <Label>Phone Number <span className="text-gray-400 font-normal text-xs">(optional)</span></Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 shrink-0 font-medium">+91</span>
              <Input
                placeholder="9876543210"
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                inputMode="numeric"
                maxLength={10}
              />
            </div>
            {lookingUp && (
              <p className="text-xs text-gray-400">Searching...</p>
            )}
            {lookupResult?.found && (
              <div className="text-xs bg-green-50 text-green-700 border border-green-200 rounded-md px-3 py-2 leading-relaxed">
                <p>✅ Returning patient: <strong>{lookupResult.name}</strong>, {lookupResult.age} yrs</p>
                {lookupResult.lastVisit && (
                  <p className="mt-0.5 text-green-600">
                    Last visit: {lookupResult.lastVisit}
                    {lookupResult.lastDoctor ? ` – ${lookupResult.lastDoctor}` : ''}
                  </p>
                )}
              </div>
            )}
            {lookupResult && !lookupResult.found && (
              <p className="text-xs text-gray-400">New patient</p>
            )}
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <Label>
              Patient Name <span className="text-red-500">*</span>
            </Label>
            <Input
              placeholder="Ramesh Kumar"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Age */}
          <div className="space-y-1.5">
            <Label>
              Age <span className="text-red-500">*</span>
            </Label>
            <Input
              placeholder="45"
              value={age}
              onChange={(e) => setAge(e.target.value.replace(/\D/g, ''))}
              inputMode="numeric"
              className="w-28"
            />
          </div>

          {/* Symptoms */}
          <div className="space-y-1.5">
            <Label>
              Problem / Symptoms <span className="text-red-500">*</span>
            </Label>
            <Textarea
              placeholder="Describe the symptoms..."
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              rows={2}
            />
          </div>

          {/* Doctor */}
          <div className="space-y-1.5">
            <Label>
              Select Doctor <span className="text-red-500">*</span>
            </Label>
            <Select value={doctorId} onValueChange={(v) => v && setDoctorId(v)}>
              <SelectTrigger className="w-full h-10">
                <SelectValue placeholder="Choose doctor...">
                  {doctorId
                    ? (() => { const d = doctors.find((x) => x._id === doctorId); return d ? `${d.name} · ${d.specialization}` : null })()
                    : null}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {doctors.map((d) => (
                  <SelectItem key={d._id} value={d._id}>
                    {d.name} · {d.specialization}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Slot — shown only after doctor is selected */}
          {doctorId && (
            <div className="space-y-1.5">
              <Label>Preferred Time Slot</Label>
              {loadingSlots ? (
                <p className="text-xs text-gray-400">Loading slots...</p>
              ) : slots.length > 0 ? (
                <Select value={slotId} onValueChange={(v) => v && setSlotId(v)}>
                  <SelectTrigger className="w-full h-10">
                    <SelectValue placeholder="Choose time...">
                      {slotId
                        ? (() => { const s = slots.find((x) => x._id === slotId); return s ? `${formatTime(s.startTime)} – ${formatTime(s.endTime)}` : null })()
                        : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {slots.map((s) => (
                      <SelectItem key={s._id} value={s._id}>
                        {formatTime(s.startTime)} – {formatTime(s.endTime)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                    No slots available for today.
                  </p>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="assignAnyway"
                      checked={assignAnyway}
                      onCheckedChange={(c) => setAssignAnyway(!!c)}
                    />
                    <label
                      htmlFor="assignAnyway"
                      className="text-sm text-gray-700 cursor-pointer"
                    >
                      Assign anyway (no slot assigned)
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            style={{ backgroundColor: '#f97316' }}
            className="hover:opacity-90 text-white w-full sm:w-auto"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Adding...' : '🚶 Add Walk-in'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
