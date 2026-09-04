import { PongCanvas } from './PongCanvas'
import { SnakeCanvas } from './SnakeCanvas'

export interface GameRegistryEntry {
  id: string
  title: string
  description: string
  /** Short instruction lines shown on the game card */
  instructions: string[]
  /** Display label for the unlock badge in the locked state, e.g. "10 Chores" */
  unlockLabel: string
  Canvas: React.ComponentType<{ onGameOver: (score: number) => void; onRestart: () => void; runId: number }>
}

/**
 * Data-driven games registry. GamesPage renders one <GameCard> per entry
 * via the generic `useSubmitScore` hook (`useSubmitScore().mutateAsync({ gameId, score })`),
 * so adding a game is a single registry line with zero page/API churn.
 * Backend parity: GAME_DEFS in backend/src/services/games.service.ts.
 *
 * PONG and SNAKE are shipped. Breakout (thirty-chores) + 2 more are
 * reserved config-only additions to reach the 5-game intent.
 */
export const GAME_REGISTRY: GameRegistryEntry[] = [
  {
    id: 'PONG',
    title: 'Pong',
    description: 'Keep the ball in play and build your score.',
    instructions: ['Move the paddle with your pointer.', 'Survive as long as you can.'],
    unlockLabel: '10 Chores',
    Canvas: PongCanvas,
  },
  {
    id: 'SNAKE',
    title: 'Snake',
    description: 'Collect apples and avoid the walls.',
    instructions: ['Swipe to steer the snake.', 'Eat apples to grow.'],
    unlockLabel: '20 Chores',
    Canvas: SnakeCanvas,
  },
]

export function getGameEntry(id: string): GameRegistryEntry | undefined {
  return GAME_REGISTRY.find(g => g.id === id)
}
