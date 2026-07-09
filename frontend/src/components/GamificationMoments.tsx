import { useEffect, useRef, useState } from 'react'
import { useGamification } from '../hooks/usePoints'
import { celebrate } from '../lib/celebrate'
import { Toast } from './ui/Toast'

export function GamificationMoments() {
  const { data } = useGamification()
  const prevRef = useRef<{ level: number; earnedIds: Set<string> } | null>(null)
  const [messages, setMessages] = useState<string[]>([])

  useEffect(() => {
    if (!data) return
    const earnedIds = new Set(data.badges.filter(b => b.earnedAt !== null).map(b => b.id))
    const prev = prevRef.current
    prevRef.current = { level: data.level.level, earnedIds }
    if (!prev) return // first load primes the baseline silently

    const newMessages: string[] = []
    if (data.level.level > prev.level) {
      newMessages.push(`🎉 Level up! You reached Level ${data.level.level}`)
    }
    const newBadges = data.badges.filter(b => b.earnedAt !== null && !prev.earnedIds.has(b.id))
    for (const badge of newBadges) {
      newMessages.push(`${badge.emoji} Badge earned: ${badge.name}!`)
    }
    if (newMessages.length > 0) {
      celebrate()
      setMessages(prev => [...prev, ...newMessages])
    }
  }, [data])

  useEffect(() => {
    if (messages.length === 0) return
    const timer = setTimeout(() => setMessages(prev => prev.slice(1)), 4000)
    return () => clearTimeout(timer)
  }, [messages])

  if (messages.length === 0) return null
  return <Toast kind="success">{messages[0]}</Toast>
}
