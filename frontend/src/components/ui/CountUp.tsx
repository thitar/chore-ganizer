import { useEffect, useRef, useState } from 'react'
import { prefersReducedMotion } from '../../utils/a11y'

export function CountUp({ value, duration = 800, className = '' }: { value: number; duration?: number; className?: string }) {
  const reduced = prefersReducedMotion()
  const [display, setDisplay] = useState(reduced ? value : 0)
  const fromRef = useRef(0)

  useEffect(() => {
    if (reduced) {
      setDisplay(value)
      return
    }
    const from = fromRef.current
    let start: number | null = null
    let raf: number
    function tick(ts: number) {
      if (start === null) start = ts
      const progress = Math.min((ts - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(from + (value - from) * eased))
      if (progress < 1) {
        raf = requestAnimationFrame(tick)
      } else {
        fromRef.current = value
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration, reduced])

  return <span className={className}>{display}</span>
}
