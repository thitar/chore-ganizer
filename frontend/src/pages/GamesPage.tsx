import { useRef, useState } from 'react'
import { AppShell } from '../components/AppShell'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { PageHeader } from '../components/ui/PageHeader'
import { Skeleton } from '../components/ui/Skeleton'
import type { GameLeaderboardEntry, GameScoreResult } from '../api/games.api'
import { GAME_REGISTRY, type GameRegistryEntry } from '../games/registry'
import { useGames, useSubmitScore } from '../hooks/useGames'

function badgeLabelFor(gameId: string): string {
  if (gameId === 'PONG') return '10 Chores'
  if (gameId === 'SNAKE') return '20 Chores'
  return gameId
}

function GameLeaderboard({ entries }: { entries: GameLeaderboardEntry[] }) {
  return (
    <Card className="divide-y divide-edge p-0">
      <div className="flex items-center gap-3 px-4 py-2 text-xs uppercase tracking-wider text-zinc-500">
        <span className="w-6 text-center">Rank</span>
        <span className="flex-1">Player</span>
        <span>Score</span>
      </div>
      {entries.map((entry, i) => (
        <div key={entry.user.id} className="flex items-center gap-3 px-4 py-3">
          <span className="w-6 text-center text-sm text-zinc-500">{i + 1}</span>
          <Avatar name={entry.user.name} color={entry.user.color} size="sm" />
          <span className="flex-1 font-medium text-zinc-200">{entry.user.name}</span>
          <span className="font-display font-bold text-zinc-100">{entry.score}</span>
        </div>
      ))}
    </Card>
  )
}

function GameCard({ entry, status }: { entry: GameRegistryEntry; status: { unlocked: boolean; personalBest: number | null; leaderboard: GameLeaderboardEntry[] | null } }) {
  const submitMutation = useSubmitScore()
  const [launched, setLaunched] = useState(false)
  const [runId, setRunId] = useState(0)
  const [finalScore, setFinalScore] = useState<number | null>(null)
  const [scoreResult, setScoreResult] = useState<GameScoreResult | null>(null)
  const [submissionFailed, setSubmissionFailed] = useState(false)
  const submissionIdRef = useRef(0)

  function submitScore(score: number) {
    const submissionId = ++submissionIdRef.current
    setSubmissionFailed(false)
    setScoreResult(null)
    void submitMutation.mutateAsync({ gameId: entry.id, score })
      .then((result: GameScoreResult) => {
        if (submissionId === submissionIdRef.current) setScoreResult(result)
      })
      .catch(() => {
        if (submissionId === submissionIdRef.current) setSubmissionFailed(true)
      })
  }

  function handleGameOver(score: number) {
    setFinalScore(score)
    submitScore(score)
  }

  function launchGame() {
    submissionIdRef.current++
    setLaunched(true)
    setFinalScore(null)
    setScoreResult(null)
    setSubmissionFailed(false)
    setRunId(current => current + 1)
  }

  if (!status.unlocked) {
    return (
      <Card className="p-8 text-center" data-testid={`game-card-${entry.id}`}>
        <h3 className="mb-2 font-display text-xl font-bold text-zinc-100">{entry.title} is locked</h3>
        <p className="text-zinc-400">Earn the {badgeLabelFor(entry.id)} badge to unlock {entry.title}.</p>
      </Card>
    )
  }

  const Canvas = entry.Canvas

  return (
    <div data-testid={`game-card-${entry.id}`} className="mb-8">
      <Card className="mb-6 overflow-hidden p-0">
        <div className="border-b border-edge bg-gradient-to-r from-accent/15 via-surface to-surface p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="mb-1 text-xs uppercase tracking-wider text-accent">Arcade</p>
              <h3 className="font-display text-2xl font-bold text-zinc-100">{entry.title}</h3>
              <p className="mt-2 max-w-xl text-sm text-zinc-400">{entry.description}</p>
            </div>
            {!launched && <Button onClick={launchGame}>Launch {entry.title}</Button>}
          </div>
        </div>

        <div className="space-y-4 p-6">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-400">
            {entry.instructions.map(text => (
              <span key={text}>{text}</span>
            ))}
          </div>
          <p className="text-sm text-zinc-500">
            Best score:{' '}
            <span className="font-semibold text-zinc-200">{status.personalBest ?? 'No score yet'}</span>
          </p>

          {launched && (
            <div className="space-y-4">
              <Canvas onGameOver={handleGameOver} onRestart={launchGame} runId={runId} />
              {finalScore !== null && (
                <div className="rounded-xl border border-edge bg-surface-raised p-4">
                  <p className="font-display text-lg font-bold text-zinc-100">{entry.title} score: {finalScore}</p>
                  {submitMutation.isPending && <p className="mt-1 text-sm text-zinc-400">Submitting score...</p>}
                  {submissionFailed && (
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <p className="text-sm text-rose-400">Unable to submit score.</p>
                      <Button variant="secondary" onClick={() => submitScore(finalScore)}>Retry score</Button>
                    </div>
                  )}
                  {scoreResult && (
                    <p className="mt-1 text-sm text-emerald-400">
                      {scoreResult.isNewBest ? 'New best score!' : `Best score: ${scoreResult.personalBest}`}
                    </p>
                  )}
                  <Button className="mt-4" variant="secondary" onClick={launchGame}>Restart</Button>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {status.leaderboard !== null && (
        <section>
          <h3 className="mb-3 font-display text-base font-bold text-zinc-100">{entry.title} leaderboard</h3>
          {status.leaderboard.length > 0 ? (
            <GameLeaderboard entries={status.leaderboard} />
          ) : (
            <Card><p className="text-sm text-zinc-500">No scores yet.</p></Card>
          )}
        </section>
      )}
    </div>
  )
}

export function GamesPage() {
  const { data, isLoading, error } = useGames()

  if (isLoading) {
    return (
      <AppShell>
        <div className="space-y-3">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64" />
          <Skeleton className="h-40" />
        </div>
      </AppShell>
    )
  }

  if (error) {
    return (
      <AppShell>
        <div className="py-12 text-center">
          <h2 className="mb-2 font-display text-2xl font-bold text-zinc-100">Something went wrong</h2>
          <p className="mb-4 text-zinc-400">Unable to load games. Check your connection and try again.</p>
          <Button onClick={() => window.location.reload()}>Try again</Button>
        </div>
      </AppShell>
    )
  }

  if (!data) return null

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <PageHeader title="Games" />

        {GAME_REGISTRY.map(entry => {
          const status = (data[entry.id] ?? (data as Record<string, unknown>)[entry.id.toLowerCase()] ?? { unlocked: false, personalBest: null, leaderboard: null }) as { unlocked: boolean; personalBest: number | null; leaderboard: GameLeaderboardEntry[] | null }
          return <GameCard key={entry.id} entry={entry} status={status} />
        })}
      </div>
    </AppShell>
  )
}

export { GameLeaderboard }
