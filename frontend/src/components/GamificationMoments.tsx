import { useEffect, useRef, useState } from 'react'
import { useGamification } from '../hooks/usePoints'
import { celebrate } from '../lib/celebrate'
import { Toast } from './ui/Toast'

export function GamificationMoments() {
  const { data } = useGamification()
  const prevRef = useRef<{ level: number; earnedIds: Set<string> } | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!data) return
    const earnedIds = new Set(data.badges.filter(b => b.earnedAt !== null).map(b => b.id))
    const prev = prevRef.current
    prevRef.current = { level: data.level.level, earnedIds }
    if (!prev) return // first load primes the baseline silently

    if (data.level.level > prev.level) {
      setMessage(`🎉 Level up! You reached Level ${data.level.level}`)
      celebrate()
      return
    }
    const newBadge = data.badges.find(b => b.earnedAt !== null && !prev.earnedIds.has(b.id))
    if (newBadge) {
      setMessage(`${newBadge.emoji} Badge earned: ${newBadge.name}!`)
      celebrate()
    }
  }, [data])

  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => setMessage(null), 4000)
    return () => clearTimeout(timer)
  }, [message])

  if (!message) return null
  return <Toast kind="success">{message}</Toast>
}
