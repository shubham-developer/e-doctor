'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useApp } from '@/lib/context'
import {
  LayoutDashboard,
  Users,
  Settings,
  Stethoscope,
  X,
  ClipboardPlus,
  Pill,
  ChevronDown,
  FileText,
  FlaskConical,
  Users2,
} from 'lucide-react'

interface NavChild {
  href: string
  label: string
  icon: React.ElementType
}

interface NavItem {
  href: string
  key: string
  icon: React.ElementType
  children?: NavChild[]
}

const navItems: NavItem[] = [
  { href: '/dashboard', key: 'dashboard', icon: LayoutDashboard },
  { href: '/dashboard/patients', key: 'patients', icon: Users },
  { href: '/dashboard/opd', key: 'opd', icon: ClipboardPlus },
  { href: '/dashboard/hr', key: 'hr', icon: Users2 },
  {
    href: '/dashboard/pharmacy',
    key: 'pharmacy',
    icon: Pill,
    children: [
      { href: '/dashboard/pharmacy', label: 'Bills', icon: FileText },
      { href: '/dashboard/pharmacy/medicines', label: 'Medicines', icon: FlaskConical },
    ],
  },
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
    if (href === '/dashboard/pharmacy') return pathname === '/dashboard/pharmacy'
    return pathname.startsWith(href)
  }

  const isParentActive = (item: NavItem) => {
    if (item.children) return item.children.some(c => isActive(c.href))
    return isActive(item.href)
  }

  // auto-expand the parent whose child matches the current path
  const defaultExpanded = navItems.find(i => i.children?.some(c => isActive(c.href)))?.key ?? null
  const [expanded, setExpanded] = useState<string | null>(defaultExpanded)

  useEffect(() => {
    const match = navItems.find(i => i.children?.some(c => isActive(c.href)))
    if (match) setExpanded(match.key)
  }, [pathname])

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={onClose} />
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
            const parentActive = isParentActive(item)
            const isOpen       = expanded === item.key

            if (item.children) {
              return (
                <div key={item.key}>
                  <button
                    onClick={() => setExpanded(isOpen ? null : item.key)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all',
                      parentActive
                        ? 'bg-teal-50 text-teal-700 border border-teal-100'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    <item.icon className={cn('w-5 h-5 shrink-0', parentActive ? 'text-teal-600' : '')} />
                    <span>{t(item.key as keyof typeof t)}</span>
                    <ChevronDown
                      className={cn(
                        'w-4 h-4 ml-auto transition-transform duration-200 text-gray-400',
                        isOpen ? 'rotate-180' : ''
                      )}
                    />
                  </button>

                  {isOpen && (
                    <div className="mt-1 ml-4 pl-3 border-l border-gray-100 space-y-0.5">
                      {item.children.map(child => {
                        const childActive = isActive(child.href)
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={onClose}
                            className={cn(
                              'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all',
                              childActive
                                ? 'bg-teal-50 text-teal-700 font-medium'
                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                            )}
                          >
                            <child.icon className={cn('w-4 h-4 shrink-0', childActive ? 'text-teal-600' : '')} />
                            {child.label}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all',
                  parentActive
                    ? 'bg-teal-50 text-teal-700 border border-teal-100'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <item.icon className={cn('w-5 h-5 shrink-0', parentActive ? 'text-teal-600' : '')} />
                <span>{t(item.key as keyof typeof t)}</span>
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
