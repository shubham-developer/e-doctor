import { NextRequest } from 'next/server'
import { apiResponse, apiError } from '@/lib/api'

export async function GET(req: NextRequest) {
  const adminId = req.headers.get('x-admin-id')
  const email = req.headers.get('x-admin-email')
  const name = req.headers.get('x-admin-name')
  if (!adminId) return apiError('Unauthorized', 401)
  return apiResponse({ admin: { id: adminId, email, name } })
}
