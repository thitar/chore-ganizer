import { useRef, useState } from 'react'
import { AppShell } from '../components/AppShell'
import { Leaderboard } from '../components/Leaderboard'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { PageHeader } from '../components/ui/PageHeader'
import { Skeleton } from '../components/ui/Skeleton'
import { PongCanvas } from '../games/PongCanvas'
import { useGames, useSubmitPongScore } from '../hooks/useGames'
import type { PongScoreResult } from '../api/games.api'

export function GamesPage() {
  const { data, isLoading, error } = useGames()
  const submitMutation = useSubmitPongScore()
  const [launched, setLaunched] = useState(false)
  const [runId, setRunId] = useState(0)
  const [finalScore, setFinalScore] = useState<number | null>(null)
  const [scoreResult, setScoreResult] = useState<PongScoreResult | null>(null)
  const [submissionFailed, setSubmissionFailed] = useState(false)
  const submissionIdRef = useRef(0)

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

  if (!data.pong.unlocked) {
    return (
      <AppShell>
        <div className="mx-auto max-w-4xl">
          <PageHeader title="Games" />
          <Card className="p-8 text-center">
            <h3 className="mb-2 font-display text-xl font-bold text-zinc-100">Pong is locked</h3>
            <p className="text-zinc-400">Earn the 10 Chores badge to unlock Pong.</p>
          </Card>
        </div>
      </AppShell>
    )
  }

  function submitScore(score: number) {
    const submissionId = ++submissionIdRef.current
    setSubmissionFailed(false)
    setScoreResult(null)
    void submitMutation.mutateAsync(score)
      .then(result => {
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

  const childLeaderboard = data.pong.leaderboard
    ? data.pong.leaderboard.map(entry => ({
      user: { ...entry.user, role: 'CHILD' },
      balance: entry.score,
    }))
    : null

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <PageHeader title="Games" />

        <Card className="mb-6 overflow-hidden p-0">
          <div className="border-b border-edge bg-gradient-to-r from-accent/15 via-surface to-surface p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="mb-1 text-xs uppercase tracking-wider text-accent">Arcade</p>
                <h3 className="font-display text-2xl font-bold text-zinc-100">Pong</h3>
                <p className="mt-2 max-w-xl text-sm text-zinc-400">Keep the ball in play and build your score.</p>
              </div>
              {!launched && <Button onClick={launchGame}>Launch Pong</Button>}
            </div>
          </div>

          <div className="space-y-4 p-6">
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-400">
              <span>Move the paddle with your pointer.</span>
              <span>Survive as long as you can.</span>
            </div>
            <p className="text-sm text-zinc-500">
              Personal best:{' '}
              <span className="font-semibold text-zinc-200">{data.pong.personalBest ?? 'No score yet'}</span>
            </p>

            {launched && (
              <div className="space-y-4">
                <PongCanvas onGameOver={handleGameOver} runId={runId} />
                {finalScore !== null && (
                  <div className="rounded-xl border border-edge bg-surface-raised p-4">
                    <p className="font-display text-lg font-bold text-zinc-100">Final score: {finalScore}</p>
                    {submitMutation.isPending && <p className="mt-1 text-sm text-zinc-400">Submitting score...</p>}
                    {submissionFailed && (
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <p className="text-sm text-rose-400">Unable to submit score.</p>
                        <Button variant="secondary" onClick={() => submitScore(finalScore)}>Retry score</Button>
                      </div>
                    )}
                    {scoreResult && (
                      <p className="mt-1 text-sm text-emerald-400">
                        {scoreResult.isNewBest ? 'New personal best!' : `Personal best: ${scoreResult.personalBest}`}
                      </p>
                    )}
                    <Button className="mt-4" variant="secondary" onClick={launchGame}>Restart</Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        {childLeaderboard !== null && (
          <section>
            <h3 className="mb-3 font-display text-base font-bold text-zinc-100">Pong leaderboard</h3>
            {childLeaderboard.length > 0 ? (
              <Leaderboard entries={childLeaderboard} />
            ) : (
              <Card><p className="text-sm text-zinc-500">No scores yet.</p></Card>
            )}
          </section>
        )}
      </div>
    </AppShell>
  )
}
