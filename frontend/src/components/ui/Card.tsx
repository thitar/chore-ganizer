import { ReactNode } from 'react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-edge bg-surface p-4 ${className}`}>{children}</div>
}
