'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { useApp } from '@/lib/context'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Menu, LogOut, User, Globe } from 'lucide-react'

const planColors = {
  STARTER: 'bg-gray-100 text-gray-700',
  GROWTH: 'bg-blue-100 text-blue-700',
  PRO: 'bg-orange-100 text-orange-700',
}

interface TopbarProps {
  onMenuClick: () => void
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const router = useRouter()
  const { user, tenant, lang, setLang } = useApp()
  const t = useTranslations('topbar')

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    toast.success('Logged out successfully')
    router.push('/login')
  }

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'CB'

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 lg:px-6 shrink-0">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Menu className="w-5 h-5 text-gray-600" />
        </button>

        <div className="hidden sm:flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-3 py-1.5">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs font-medium text-green-700">{t('botLive')}</span>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
          className="text-gray-600 gap-1.5 hidden sm:flex"
        >
          <Globe className="w-4 h-4" />
          {t('switchLang')}
        </Button>

        {tenant && (
          <Badge className={`${planColors[tenant.plan]} border-0 font-semibold hidden sm:flex`}>
            {tenant.plan}
          </Badge>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger render={<button className="flex items-center gap-2 rounded-full hover:bg-gray-50 p-1 transition-colors" />}>
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-teal-100 text-teal-700 text-sm font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-gray-700 hidden md:block max-w-32 truncate">
              {user?.name}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>
              <p className="font-medium">{user?.name}</p>
              <p className="text-xs text-gray-500 font-normal truncate">{user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="sm:hidden" onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}>
              <Globe className="w-4 h-4 mr-2" />
              {t('switchLang')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}>
              <User className="w-4 h-4 mr-2" />
              {t('settings')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600">
              <LogOut className="w-4 h-4 mr-2" />
              {t('logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
