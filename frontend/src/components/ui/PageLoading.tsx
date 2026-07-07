import { Skeleton } from './Skeleton'

interface PageLoadingProps {
  /** Number of skeleton rows to show */
  rows?: number
}

export function PageLoading({ rows = 3 }: PageLoadingProps) {
  return (
    <div className="space-y-4 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-xl" />
      ))}
    </div>
  )
}
