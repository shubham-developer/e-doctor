'use client'

import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type Status = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'

const styles: Record<Status, string> = {
  PENDING:   'bg-yellow-100 text-yellow-700 border-yellow-200',
  CONFIRMED: 'bg-green-100  text-green-700  border-green-200',
  CANCELLED: 'bg-red-100    text-red-700    border-red-200',
  COMPLETED: 'bg-blue-100   text-blue-700   border-blue-200',
}

export function StatusBadge({ status }: { status: Status }) {
  const t = useTranslations('status')
  return (
    <Badge className={cn('font-semibold border', styles[status])}>
      {t(status)}
    </Badge>
  )
}
