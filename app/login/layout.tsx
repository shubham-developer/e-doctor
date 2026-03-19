'use client'

import { NextIntlClientProvider } from 'next-intl'
import enMessages from '@/messages/en.json'

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <NextIntlClientProvider locale="en" messages={enMessages} onError={() => {}}>
      {children}
    </NextIntlClientProvider>
  )
}
