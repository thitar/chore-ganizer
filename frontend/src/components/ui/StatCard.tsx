import { ReactNode } from 'react'
import { Card } from './Card'

export function StatCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Card className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wider text-zinc-500">{label}</span>
      <span className="font-display text-3xl font-bold text-zinc-100">{children}</span>
    </Card>
  )
}
