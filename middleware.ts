import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { verifyAdminToken, ADMIN_COOKIE } from '@/lib/admin-auth'

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/seed', '/admin/login', '/api/admin/auth/login']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    const token = request.cookies.get(ADMIN_COOKIE)?.value

    if (!token) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
      }
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    const payload = await verifyAdminToken(token)
    if (!payload) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 })
      }
      const response = NextResponse.redirect(new URL('/admin/login', request.url))
      response.cookies.delete(ADMIN_COOKIE)
      return response
    }

    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-admin-id', payload.adminId)
    requestHeaders.set('x-admin-email', payload.email)
    requestHeaders.set('x-admin-name', payload.name)

    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  if (pathname.startsWith('/dashboard') || pathname.startsWith('/api/dashboard')) {
    const token = request.cookies.get('edoctor_token')?.value

    if (!token) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
      }
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const payload = await verifyToken(token)
    if (!payload) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 })
      }
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('edoctor_token')
      return response
    }

    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', payload.userId)
    requestHeaders.set('x-tenant-id', payload.tenantId)
    requestHeaders.set('x-user-role', payload.role)
    requestHeaders.set('x-user-email', payload.email)
    requestHeaders.set('x-user-name', payload.name)

    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/dashboard/:path*', '/login', '/admin/:path*', '/api/admin/:path*'],
}
