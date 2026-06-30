import { BedSetupTab } from '@/components/settings/BedSetupTab'

export const metadata = { title: 'Bed Setup' }

export default function BedSetupPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bed Setup</h1>
        <p className="text-gray-500 text-sm mt-1">Manage bed status, beds, types, groups and floors</p>
      </div>
      <BedSetupTab />
    </div>
  )
}
