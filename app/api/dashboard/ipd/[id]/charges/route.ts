import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/db'
import IpdCharge from '@/models/IpdCharge'
import IpdAdmission from '@/models/IpdAdmission'
import { apiResponse, apiError } from '@/lib/api'
import { todayString } from '@/lib/format'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenantId = req.headers.get('x-tenant-id')
  if (!tenantId) return apiError('Unauthorized', 401)

  const { id } = await params
  await connectDB()

  const charges = await IpdCharge.find({ tenantId, ipdId: id }).sort({ createdAt: 1 })
  return apiResponse(charges)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenantId  = req.headers.get('x-tenant-id')
  const role      = req.headers.get('x-user-role')
  const userName  = req.headers.get('x-user-name') ?? ''
  if (!tenantId) return apiError('Unauthorized', 401)
  if (role === 'VIEWER') return apiError('Insufficient permissions', 403)

  const { id } = await params
  await connectDB()

  const admission = await IpdAdmission.findOne({ _id: id, tenantId })
  if (!admission) return apiError('IPD admission not found', 404)

  const body = await req.json()
  const { categoryName, quantity, unitPrice, note, date } = body

  if (!categoryName?.trim()) return apiError('Category name is required', 400)
  if (!unitPrice || Number(unitPrice) <= 0) return apiError('Unit price must be greater than 0', 400)

  const qty   = Math.max(1, Number(quantity) || 1)
  const price = Number(unitPrice)
  const total = qty * price

  const charge = await IpdCharge.create({
    tenantId,
    ipdId:       id,
    categoryName: categoryName.trim(),
    quantity:    qty,
    unitPrice:   price,
    total,
    date:        date || todayString(),
    note:        note?.trim() || undefined,
    addedByName: userName,
  })

  return apiResponse(charge, 201)
}
