'use client'

import { useEffect, useState } from 'react'
import { useCurrency } from '@/lib/context'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { PageLoader } from '@/components/ui/page-loader'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { IndianRupee, Plus, Trash2, Pencil, X } from 'lucide-react'

interface ChargeCategory {
  _id: string
  name: string
  defaultFee: number
  isActive: boolean
}

export default function ChargesPage() {
  const { sym } = useCurrency()
  const [loading, setLoading] = useState(true)
  const [charges, setCharges] = useState<ChargeCategory[]>([])
  const [newChargeName, setNewChargeName] = useState('')
  const [newChargeFee, setNewChargeFee] = useState('')
  const [addingCharge, setAddingCharge] = useState(false)
  const [editingCharge, setEditingCharge] = useState<{ id: string; name: string; fee: string } | null>(null)

  async function loadCharges() {
    const res = await fetch('/api/dashboard/charges')
    const data = await res.json()
    if (data.success) setCharges(data.data)
    setLoading(false)
  }

  useEffect(() => { loadCharges() }, [])

  async function addCharge() {
    if (!newChargeName.trim()) { toast.error('Charge name is required'); return }
    setAddingCharge(true)
    const res = await fetch('/api/dashboard/charges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newChargeName.trim(), defaultFee: Number(newChargeFee) || 0 }),
    })
    const data = await res.json()
    if (data.success) {
      toast.success('Charge added')
      setNewChargeName('')
      setNewChargeFee('')
      loadCharges()
    } else {
      toast.error(data.error)
    }
    setAddingCharge(false)
  }

  async function saveCharge() {
    if (!editingCharge) return
    const res = await fetch(`/api/dashboard/charges/${editingCharge.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editingCharge.name, defaultFee: Number(editingCharge.fee) || 0 }),
    })
    const data = await res.json()
    if (data.success) { toast.success('Charge updated'); setEditingCharge(null); loadCharges() }
    else toast.error(data.error)
  }

  async function toggleCharge(charge: ChargeCategory) {
    const res = await fetch(`/api/dashboard/charges/${charge._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !charge.isActive }),
    })
    const data = await res.json()
    if (data.success) loadCharges()
    else toast.error(data.error)
  }

  async function deleteCharge(id: string) {
    const res = await fetch(`/api/dashboard/charges/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.success) { toast.success('Charge deleted'); loadCharges() }
    else toast.error(data.error)
  }

  if (loading) return <PageLoader rows={5} />

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Add Charge Category</CardTitle>
          <CardDescription>Define billable services for OPD visits (e.g. Consultation, BP Checkup)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 items-end">
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs text-gray-500">Charge Name</Label>
              <Input
                placeholder="OPD Consultation"
                value={newChargeName}
                onChange={e => setNewChargeName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCharge()}
                className="h-10"
              />
            </div>
            <div className="w-28 space-y-1.5">
              <Label className="text-xs text-gray-500">Default Fee (₹)</Label>
              <Input
                type="number"
                placeholder="200"
                value={newChargeFee}
                onChange={e => setNewChargeFee(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCharge()}
                className="h-10"
                min={0}
              />
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700 gap-2 h-10 shrink-0" onClick={addCharge} disabled={addingCharge}>
              <Plus className="w-4 h-4" /> Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Configured Charges ({charges.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!charges.length ? (
            <div className="text-center py-10 text-gray-400">
              <IndianRupee className="w-10 h-10 mx-auto mb-2 text-gray-200" />
              <p className="text-sm">No charges configured yet</p>
              <p className="text-xs mt-1">Add your first charge category above</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {charges.map(charge => (
                <div key={charge._id} className="flex items-center gap-3 px-4 py-3">
                  {editingCharge?.id === charge._id ? (
                    <>
                      <Input
                        value={editingCharge.name}
                        onChange={e => setEditingCharge({ ...editingCharge, name: e.target.value })}
                        className="h-8 flex-1"
                        autoFocus
                      />
                      <div className="relative w-24">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs">₹</span>
                        <Input
                          type="number"
                          value={editingCharge.fee}
                          onChange={e => setEditingCharge({ ...editingCharge, fee: e.target.value })}
                          className="h-8 pl-6"
                          min={0}
                        />
                      </div>
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700 h-8 px-3" onClick={saveCharge}>Save</Button>
                      <button onClick={() => setEditingCharge(null)} className="p-1.5 text-gray-400 hover:text-gray-600">
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${charge.isActive ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
                          {charge.name}
                        </p>
                      </div>
                      <span className={`text-sm font-mono font-semibold ${charge.isActive ? 'text-blue-700' : 'text-gray-400'}`}>
                        {sym}{charge.defaultFee.toLocaleString('en-IN')}
                      </span>
                      <Switch checked={charge.isActive} onCheckedChange={() => toggleCharge(charge)} />
                      <button
                        onClick={() => setEditingCharge({ id: charge._id, name: charge.name, fee: String(charge.defaultFee) })}
                        className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <AlertDialog>
                        <AlertDialogTrigger render={<button className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" />}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete "{charge.name}"?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This charge will be removed from the list. Existing OPD receipts won&apos;t be affected.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteCharge(charge._id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
