import confetti from 'canvas-confetti'
import { prefersReducedMotion } from '../components/ui/CountUp'

export function celebrate(): void {
  if (prefersReducedMotion()) return
  confetti({
    particleCount: 90,
    spread: 70,
    origin: { y: 0.7 },
    colors: ['#8B5CF6', '#6366F1', '#34D399', '#FBBF24'],
  })
}
