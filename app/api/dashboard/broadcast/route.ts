import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/db'
import Broadcast from '@/models/Broadcast'
import { apiResponse, apiError } from '@/lib/api'

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id')
  if (!tenantId) return apiError('Unauthorized', 401)

  await connectDB()
  const broadcasts = await Broadcast.find({ tenantId }).sort({ createdAt: -1 }).limit(50)
  return apiResponse(broadcasts)
}

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id')
  const role = req.headers.get('x-user-role')
  if (!tenantId) return apiError('Unauthorized', 401)
  if (role === 'VIEWER') return apiError('Insufficient permissions', 403)

  await connectDB()
  const body = await req.json()
  const { message, language, target, scheduledAt } = body

  if (!message?.trim()) return apiError('Message is required', 400)
  if (message.length > 1024) return apiError('Message exceeds 1024 characters', 400)

  const status = scheduledAt ? 'SCHEDULED' : 'SENT'
  const sentAt = scheduledAt ? null : new Date()

  const broadcast = await Broadcast.create({
    tenantId,
    message,
    language: language || 'hi',
    target: target || 'ALL',
    sentCount: scheduledAt ? 0 : Math.floor(Math.random() * 100) + 10, // mock count
    failedCount: 0,
    scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
    sentAt,
    status,
  })

  return apiResponse(broadcast, 201)
}
