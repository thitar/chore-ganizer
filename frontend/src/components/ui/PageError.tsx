import { Button } from './Button'

interface PageErrorProps {
  message?: string
  onRetry?: () => void
}

export function PageError({ message = 'Unable to load. Check your connection and try again.', onRetry }: PageErrorProps) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="text-center max-w-md">
        <h2 className="font-display text-2xl font-bold text-zinc-100 mb-2">Something went wrong</h2>
        <p className="text-zinc-400 mb-4">{message}</p>
        {onRetry && (
          <Button onClick={onRetry}>Try again</Button>
        )}
      </div>
    </div>
  )
}
