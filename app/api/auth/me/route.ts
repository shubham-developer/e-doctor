import { getSession } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Tenant from '@/models/Tenant'
import { apiResponse, apiError } from '@/lib/api'

export async function GET() {
  const session = await getSession()
  if (!session) return apiError('Unauthorized', 401)

  await connectDB()
  const tenant = await Tenant.findById(session.tenantId).select('-whatsappAccessToken')
  if (!tenant) return apiError('Tenant not found', 404)

  return apiResponse({
    user: {
      id: session.userId,
      name: session.name,
      email: session.email,
      role: session.role,
    },
    tenant: {
      id: tenant._id,
      name: tenant.name,
      slug: tenant.slug,
      whatsappNumber: tenant.whatsappNumber,
      logoUrl: tenant.logoUrl,
      brandColor: tenant.brandColor,
      plan: tenant.plan,
      planExpiresAt: tenant.planExpiresAt,
    },
  })
}
