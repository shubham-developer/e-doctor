'use client'

import { cn } from '@/lib/utils'
import type { ChargesTab } from './types'

const TABS: { key: ChargesTab; label: string }[] = [
  { key: 'charges', label: 'Charges' },
  { key: 'chargeCategory', label: 'Charge Category' },
  { key: 'chargeType', label: 'Charge Type' },
  { key: 'taxCategory', label: 'Tax Category' },
  { key: 'unitType', label: 'Unit Type' },
]

export function ChargesSidebar({
  active,
  onChange,
}: {
  active: ChargesTab
  onChange: (tab: ChargesTab) => void
}) {
  return (
    <nav className="w-44 shrink-0 border-r border-gray-200 bg-gray-50 flex flex-col">
      {TABS.map(tab => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={cn(
            'text-left px-4 py-3 text-sm border-b border-gray-100 transition-colors',
            active === tab.key
              ? 'bg-white text-blue-600 font-semibold border-l-2 border-l-blue-500'
              : 'text-gray-600 hover:bg-gray-100',
          )}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
