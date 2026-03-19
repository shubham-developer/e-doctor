'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { NextIntlClientProvider } from 'next-intl'
import enMessages from '@/messages/en.json'
import hiMessages from '@/messages/hi.json'

interface User {
  id: string
  name: string
  email: string
  role: 'OWNER' | 'RECEPTIONIST' | 'VIEWER'
}

interface TenantInfo {
  id: string
  name: string
  slug: string
  whatsappNumber: string
  logoUrl: string
  brandColor: string
  plan: 'STARTER' | 'GROWTH' | 'PRO'
  planExpiresAt: string
}

interface AppContextType {
  user: User | null
  tenant: TenantInfo | null
  lang: 'hi' | 'en'
  setLang: (l: 'hi' | 'en') => void
  loading: boolean
  refetch: () => void
}

const AppContext = createContext<AppContextType>({
  user: null,
  tenant: null,
  lang: 'en',
  setLang: () => {},
  loading: true,
  refetch: () => {},
})

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
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

  const messages = lang === 'hi' ? hiMessages : enMessages

  return (
    <AppContext.Provider value={{ user, tenant, lang, setLang, loading, refetch: fetchMe }}>
      <NextIntlClientProvider locale={lang} messages={messages} onError={() => {}}>
        {children}
      </NextIntlClientProvider>
    </AppContext.Provider>
  )
}

export function useApp() {
  return useContext(AppContext)
}
