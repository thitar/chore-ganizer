import { ReactNode } from 'react'

export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <h2 className="font-display text-2xl font-bold text-zinc-100">{title}</h2>
      {action}
    </div>
  )
}
