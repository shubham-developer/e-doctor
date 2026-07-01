'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { NextIntlClientProvider } from 'next-intl'
import enMessages from '@/messages/en.json'
import hiMessages from '@/messages/hi.json'

type PermCol = 'view' | 'add' | 'edit' | 'delete'
type PermEntry = Partial<Record<PermCol, boolean>>
type Permissions = Record<string, Record<string, PermEntry>>

interface CustomRole {
  name: string
  permissions: Permissions
}

interface User {
  id: string
  name: string
  email: string
  role: 'OWNER' | 'RECEPTIONIST' | 'VIEWER'
  customRole: CustomRole | null
}

interface TenantInfo {
  id: string
  name: string
  slug: string
  address?: string
  whatsappNumber: string
  logoUrl: string
  smallLogoUrl: string
  brandColor: string
  plan: 'STARTER' | 'GROWTH' | 'PRO'
  planExpiresAt: string
  currency: string
  currencySymbol: string
}

interface AppContextType {
  user: User | null
  tenant: TenantInfo | null
  lang: 'hi' | 'en'
  setLang: (l: 'hi' | 'en') => void
  loading: boolean
  refetch: () => void
  /** Returns true if the user can perform `action` on `moduleKey`.
   *  Users without a custom role (OWNER, RECEPTIONIST, VIEWER) always return true. */
  can: (moduleKey: string, action?: PermCol) => boolean
}

const AppContext = createContext<AppContextType>({
  user: null,
  tenant: null,
  lang: 'en',
  setLang: () => {},
  loading: true,
  refetch: () => {},
  can: () => true,
})

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser]     = useState<User | null>(null)
  const [tenant, setTenant] = useState<TenantInfo | null>(null)
  const [lang, setLangState] = useState<'hi' | 'en'>('en')
  const [loading, setLoading] = useState(true)

  function setLang(l: 'hi' | 'en') {
    setLangState(l)
    localStorage.setItem('edoctor_lang', l)
  }

  async function fetchMe() {
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const data = await res.json()
        setUser(data.data.user)
        setTenant(data.data.tenant)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const saved = localStorage.getItem('edoctor_lang') as 'hi' | 'en' | null
    if (saved) setLangState(saved)
    fetchMe()
  }, [])

  const can = useCallback((moduleKey: string, action: PermCol = 'view'): boolean => {
    // While loading, or if session failed — show everything (middleware handles auth redirect)
    if (!user) return true
    // Users without a custom role see everything
    if (!user.customRole) return true

    const modulePerm = user.customRole.permissions?.[moduleKey] as Record<string, unknown> | undefined
    if (!modulePerm) return false
    // flat structure: { view: true, add: false, ... }
    return !!(modulePerm[action])
  }, [user])

  const messages = lang === 'hi' ? hiMessages : enMessages

  return (
    <AppContext.Provider value={{ user, tenant, lang, setLang, loading, refetch: fetchMe, can }}>
      <NextIntlClientProvider locale={lang} messages={messages} onError={() => {}}>
        {children}
      </NextIntlClientProvider>
    </AppContext.Provider>
  )
}

export function useApp() {
  return useContext(AppContext)
}
