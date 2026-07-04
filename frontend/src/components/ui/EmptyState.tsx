import { LucideIcon } from 'lucide-react'

export function EmptyState({ icon: Icon, title, hint }: { icon: LucideIcon; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center py-12 text-center">
      <Icon aria-hidden className="mb-3 h-10 w-10 text-zinc-600" />
      <p className="font-display font-bold text-zinc-100">{title}</p>
      {hint && <p className="mt-1 text-sm text-zinc-400">{hint}</p>}
    </div>
  )
}
