import { NextRequest } from 'next/server'
import { connectDB } from '@/lib/db'
import Role from '@/models/Role'
import { apiResponse, apiError } from '@/lib/api'

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id')
  if (!tenantId) return apiError('Unauthorized', 401)

  await connectDB()
  const roles = await Role.find({ tenantId }).sort({ isSystem: -1, name: 1 })
  return apiResponse(roles)
}

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id')
  const role     = req.headers.get('x-user-role')
  if (!tenantId) return apiError('Unauthorized', 401)
  if (role !== 'OWNER') return apiError('Only owners can create roles', 403)

  await connectDB()
  const { name, description } = await req.json()
  if (!name?.trim()) return apiError('Role name is required', 400)

  const exists = await Role.findOne({ tenantId, name: name.trim() })
  if (exists) return apiError('A role with this name already exists', 400)

  const newRole = await Role.create({
    tenantId,
    name: name.trim(),
    description: description?.trim() || undefined,
    permissions: {},
  })

  return apiResponse(newRole, 201)
}
