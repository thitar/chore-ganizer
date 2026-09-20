import { PongCanvas } from './PongCanvas'
import { SnakeCanvas } from './SnakeCanvas'
import { BreakoutCanvas } from './BreakoutCanvas'
import { SpaceInvadersCanvas } from './SpaceInvadersCanvas'
import { FlappyBirdCanvas } from './FlappyBirdCanvas'

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
 * PONG, SNAKE, BREAKOUT, SPACE_INVADERS, and FLAPPY_BIRD are shipped —
 * all 5 games in the intended lineup.
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
  {
    id: 'BREAKOUT',
    title: 'Breakout',
    description: 'Clear every brick without letting the ball get past your paddle.',
    instructions: ['Move the paddle with your pointer.', 'Break all the bricks to clear the board.'],
    unlockLabel: '30 Chores',
    Canvas: BreakoutCanvas,
  },
  {
    id: 'SPACE_INVADERS',
    title: 'Space Invaders',
    description: 'Hold the line against the descending enemy formation.',
    instructions: ['Drag to move your ship.', 'Fires automatically — just dodge and steer.'],
    unlockLabel: '50 Chores',
    Canvas: SpaceInvadersCanvas,
  },
  {
    id: 'FLAPPY_BIRD',
    title: 'Flappy Bird',
    description: 'Tap to flap and thread the bird through each pipe gap.',
    instructions: ['Tap anywhere to flap.', 'Avoid the pipes, ground, and ceiling.'],
    unlockLabel: '100 Points',
    Canvas: FlappyBirdCanvas,
  },
]

export function getGameEntry(id: string): GameRegistryEntry | undefined {
  return GAME_REGISTRY.find(g => g.id === id)
}
