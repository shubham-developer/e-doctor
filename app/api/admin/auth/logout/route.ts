import { ADMIN_COOKIE } from '@/lib/admin-auth'
import { apiResponse } from '@/lib/api'

export async function POST() {
  const res = new Response(JSON.stringify({ success: true }), {
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': `${ADMIN_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
    },
  })
  return res
}
