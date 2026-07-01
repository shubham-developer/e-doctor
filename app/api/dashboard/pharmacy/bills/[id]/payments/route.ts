import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/db'
import PharmacyBill from '@/models/PharmacyBill'
import { apiResponse, apiError } from '@/lib/api'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenantId = req.headers.get('x-tenant-id')
  const role     = req.headers.get('x-user-role')
  const userId   = req.headers.get('x-user-id')   ?? ''
  const userName = req.headers.get('x-user-name') ?? ''
  if (!tenantId) return apiError('Unauthorized', 401)
  if (role === 'VIEWER') return apiError('Insufficient permissions', 403)

  const { id } = await params
  await connectDB()

  const { amount, mode, note } = await req.json()
  const amt = Number(amount) || 0
  if (amt <= 0) return apiError('Payment amount must be greater than 0', 400)

  const bill = await PharmacyBill.findOne({ _id: id, tenantId })
  if (!bill) return apiError('Bill not found', 404)

  const balance = bill.netAmount - bill.paidAmount
  if (amt > balance) return apiError(`Payment exceeds balance due (${balance.toFixed(2)})`, 400)

  bill.payments.push({
    amount: amt,
    mode: mode || 'Cash',
    ...(note?.trim() && { note: note.trim() }),
    createdAt: new Date(),
    createdBy: { userId, name: userName },
  })
  bill.paidAmount += amt
  await bill.save()

  return apiResponse(bill)
}
