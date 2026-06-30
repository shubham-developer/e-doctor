import { Skeleton } from '@/components/ui/skeleton'

interface PageLoaderProps {
  rows?: number
  hasHeader?: boolean
}

export function PageLoader({ rows = 5, hasHeader = true }: PageLoaderProps) {
  return (
    <div className="space-y-4">
      {hasHeader && (
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
      )}
      <Skeleton className="h-10 w-full" />
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  )
}
