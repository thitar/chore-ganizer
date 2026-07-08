import { ReactNode } from 'react'
import { TopNav } from './TopNav'
import { BottomTabBar } from './BottomTabBar'
import { GamificationMoments } from './GamificationMoments'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg pb-20 md:pb-0">
      <TopNav />
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
      <BottomTabBar />
      <GamificationMoments />
    </div>
  )
}
