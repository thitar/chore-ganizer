import { ReactNode } from 'react'

export function Toast({ kind, children }: { kind: 'success' | 'error'; children: ReactNode }) {
  const kindClass =
    kind === 'success'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
      : 'border-rose-500/30 bg-rose-500/10 text-rose-400'
  return (
    <div role="status" className={`fixed right-4 top-4 z-50 animate-fade-up rounded-xl border px-4 py-2 shadow-lg backdrop-blur ${kindClass}`}>
      {children}
    </div>
  )
}
