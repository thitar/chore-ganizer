import { ReactNode } from 'react'

export function Card({ children, className = '', ...rest }: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-2xl border border-edge bg-surface p-4 ${className}`} {...rest}>{children}</div>
}
