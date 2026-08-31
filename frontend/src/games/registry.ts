import { PongCanvas } from './PongCanvas'
import { SnakeCanvas } from './SnakeCanvas'

export interface GameRegistryEntry {
  id: string
  title: string
  description: string
  /** Short instruction lines shown on the game card */
  instructions: string[]
  Canvas: React.ComponentType<{ onGameOver: (score: number) => void; onRestart: () => void; runId: number }>
  // submitScore per-entry will be added in #222 when GameCard wires the registry
  // (see PR #228 review). Keeping shape minimal until GamesPage consumes the registry.
}

/**
 * Data-driven games registry. GamesPage renders one <GameCard> per entry, so
 * adding a game is a single registry line with zero page/API churn.
 * Backend parity: GAME_DEFS in backend/src/services/games.service.ts.
 *
 * PONG is shipped. SNAKE is registered here in #221 but not yet rendered —
 * GamesPage still hardcodes Pong and will be migrated to the registry in #222
 * (see PR #228 review). Breakout (thirty-chores) + 2 more are reserved
 * config-only additions to reach the 5-game intent.
 */
export const GAME_REGISTRY: GameRegistryEntry[] = [
  {
    id: 'PONG',
    title: 'Pong',
    description: 'Keep the ball in play and build your score.',
    instructions: ['Move the paddle with your pointer.', 'Survive as long as you can.'],
    Canvas: PongCanvas,
  },
  {
    id: 'SNAKE',
    title: 'Snake',
    description: 'Collect apples and avoid the walls.',
    instructions: ['Swipe to steer the snake.', 'Eat apples to grow.'],
    Canvas: SnakeCanvas,
  },
]

export function getGameEntry(id: string): GameRegistryEntry | undefined {
  return GAME_REGISTRY.find(g => g.id === id)
}
