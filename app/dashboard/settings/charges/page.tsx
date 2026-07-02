'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { apiClient } from '@/lib/apiClient'
import { ChargesSidebar } from '@/components/charges/ChargesSidebar'
import { ChargesList } from '@/components/charges/ChargesList'
import { ChargeCategorySection } from '@/components/charges/ChargeCategorySection'
import { ChargeTypeSection } from '@/components/charges/ChargeTypeSection'
import { MasterDataSection } from '@/components/charges/MasterDataSection'
import { TaxCategorySection } from '@/components/charges/TaxCategorySection'
import type { ChargesTab } from '@/components/charges/types'
import type { ChargeCategoryItem, ChargeTypeItem, MasterItem, TaxCategoryItem } from '@/lib/types/charges'

const TAB_TITLES: Record<ChargesTab, string> = {
  charges: 'Charges Details List',
  chargeCategory: 'Charge Category List',
  chargeType: 'Charge Type List',
  taxCategory: 'Tax Category List',
  unitType: 'Unit Type List',
}

export default function ChargesPage() {
  const [activeTab, setActiveTab] = useState<ChargesTab>('charges')

  const [categories, setCategories] = useState<ChargeCategoryItem[]>([])
  const [types, setTypes] = useState<ChargeTypeItem[]>([])
  const [units, setUnits] = useState<MasterItem[]>([])
  const [taxCategories, setTaxCategories] = useState<TaxCategoryItem[]>([])

  async function loadLookups() {
    const [catRes, typeRes, unitRes, taxRes] = await Promise.all([
      apiClient.get<ChargeCategoryItem[]>('/api/dashboard/charge-categories'),
      apiClient.get<ChargeTypeItem[]>('/api/dashboard/charge-types'),
      apiClient.get<MasterItem[]>('/api/dashboard/unit-types'),
      apiClient.get<TaxCategoryItem[]>('/api/dashboard/tax-categories'),
    ])
    if (catRes.success) setCategories(catRes.data); else toast.error(catRes.error)
    if (typeRes.success) setTypes(typeRes.data); else toast.error(typeRes.error)
    if (unitRes.success) setUnits(unitRes.data); else toast.error(unitRes.error)
    if (taxRes.success) setTaxCategories(taxRes.data); else toast.error(taxRes.error)
  }

  useEffect(() => { loadLookups() }, [])

  return (
    <div className="flex h-[calc(100vh-220px)] min-h-96 border border-gray-200 rounded-lg overflow-hidden bg-white">
      <ChargesSidebar active={activeTab} onChange={setActiveTab} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
          <h2 className="text-sm font-semibold text-gray-800">{TAB_TITLES[activeTab]}</h2>
        </div>

        <div className="flex-1 overflow-hidden">
          {activeTab === 'charges' && (
            <ChargesList
              categories={categories}
              units={units}
              taxCategories={taxCategories}
              onMasterDataChanged={loadLookups}
            />
          )}
          {activeTab === 'chargeCategory' && (
            <ChargeCategorySection types={types} onChanged={loadLookups} />
          )}
          {activeTab === 'chargeType' && (
            <ChargeTypeSection onChanged={loadLookups} />
          )}
          {activeTab === 'taxCategory' && (
            <TaxCategorySection onChanged={loadLookups} />
          )}
          {activeTab === 'unitType' && (
            <MasterDataSection title="Unit Type" apiBase="/api/dashboard/unit-types" onChanged={loadLookups} />
          )}
        </div>
      </div>
    </div>
  )
}
