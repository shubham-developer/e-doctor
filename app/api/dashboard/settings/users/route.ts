import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/db'
import TenantUser from '@/models/TenantUser'
import { apiResponse, apiError } from '@/lib/api'

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id')
  const role = req.headers.get('x-user-role')
  if (!tenantId) return apiError('Unauthorized', 401)
  if (role !== 'OWNER') return apiError('Only owners can add team members', 403)

  await connectDB()
  const { name, email, userRole } = await req.json()

  if (!name || !email) return apiError('Name and email are required', 400)

  const exists = await TenantUser.findOne({ email: email.toLowerCase(), tenantId })
  if (exists) return apiError('User already exists', 400)

  const tempPassword = Math.random().toString(36).slice(-8)
  const passwordHash = await bcrypt.hash(tempPassword, 10)

  const user = await TenantUser.create({
    tenantId,
    name,
    email: email.toLowerCase(),
    passwordHash,
    role: userRole || 'RECEPTIONIST',
  })

  return apiResponse({
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
    tempPassword, // In production, send via email
  }, 201)
}
