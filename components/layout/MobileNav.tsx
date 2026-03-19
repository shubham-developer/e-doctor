'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Stethoscope,
  CalendarDays,
  ClipboardList,
  Settings,
} from 'lucide-react'

const mobileNav = [
  { href: '/dashboard', key: 'home', icon: LayoutDashboard },
  { href: '/dashboard/doctors', key: 'doctors', icon: Stethoscope },
  { href: '/dashboard/slots', key: 'slots', icon: CalendarDays },
  { href: '/dashboard/appointments', key: 'appointments', icon: ClipboardList },
  { href: '/dashboard/settings', key: 'settings', icon: Settings },
]

export function MobileNav() {
  const pathname = usePathname()
  const t = useTranslations('mobileNav')

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30 px-2 py-2">
      <div className="flex items-center justify-around">
        {mobileNav.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-colors min-w-0',
                active ? 'text-teal-600' : 'text-gray-500'
              )}
            >
              <item.icon className={cn('w-6 h-6', active ? 'text-teal-600' : 'text-gray-400')} />
              <span className="text-xs font-medium leading-none">
                {t(item.key as keyof typeof t)}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
