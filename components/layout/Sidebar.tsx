'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { useApp } from '@/lib/context'
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  ClipboardList,
  Megaphone,
  BarChart3,
  Settings,
  Stethoscope,
  X,
  MonitorCheck,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', key: 'dashboard', icon: LayoutDashboard },
  { href: '/dashboard/doctors', key: 'doctors', icon: Stethoscope },
  { href: '/dashboard/slots', key: 'slots', icon: CalendarDays },
  { href: '/dashboard/appointments', key: 'appointments', icon: ClipboardList },
  { href: '/dashboard/reception', key: 'reception', icon: MonitorCheck },
  { href: '/dashboard/broadcast', key: 'broadcast', icon: Megaphone, planRequired: ['GROWTH', 'PRO'] },
  { href: '/dashboard/analytics', key: 'analytics', icon: BarChart3, planRequired: ['GROWTH', 'PRO'] },
  { href: '/dashboard/settings', key: 'settings', icon: Settings },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { tenant, user } = useApp()
  const t = useTranslations('nav')

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const canAccess = (item: typeof navItems[0]) => {
    if (!item.planRequired) return true
    if (!tenant) return false
    return item.planRequired.includes(tenant.plan)
  }

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-100 z-50 flex flex-col transition-transform duration-300',
          'lg:translate-x-0 lg:static lg:z-auto lg:shrink-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-teal-600 rounded-lg flex items-center justify-center shrink-0">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-teal-700 text-sm leading-tight">e-doctor</p>
              <p className="text-xs text-gray-400 truncate">{tenant?.name ?? '...'}</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden p-1 rounded hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            const accessible = canAccess(item)
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={accessible ? item.href : '#'}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all',
                  active
                    ? 'bg-teal-50 text-teal-700 border border-teal-100'
                    : accessible
                    ? 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    : 'text-gray-300 cursor-not-allowed'
                )}
              >
                <item.icon className={cn('w-5 h-5 shrink-0', active ? 'text-teal-600' : '')} />
                <span>{t(item.key as keyof typeof t)}</span>
                {!accessible && (
                  <span className="ml-auto text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-semibold">
                    {t('proBadge')}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Plan badge */}
        <div className="p-4 border-t border-gray-100">
          <div className="bg-teal-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-teal-700 uppercase tracking-wide">
                {tenant?.plan ?? 'STARTER'} Plan
              </span>
              <span className="text-xs text-gray-500">{user?.role}</span>
            </div>
            <p className="text-xs text-gray-500">{tenant?.whatsappNumber ?? ''}</p>
          </div>
        </div>
      </aside>
    </>
  )
}
