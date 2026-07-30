# Games Rewards Design

## Goal

Add lightweight browser games as permanent, non-monetary rewards for sustained chore completion. The first release introduces Pong and establishes the route, access, score, and game-component patterns needed for later games.

## Scope

- Ship Pong only.
- Reserve Snake for 20 completed chores and Breakout for 30 completed chores; do not implement either game or unlock yet.
- Do not grant, spend, or alter chore points through games.
- Treat scores as friendly family competition, not cheat-proof results.

## Access And Progression

- Add a child-facing `/games` route and a conditional Games navigation item.
- A child permanently unlocks Pong by earning the existing `ten-chores` badge.
- Before a child unlocks Pong, do not show the Games navigation item, a game card, or a Pong leaderboard.
- A child who directly visits `/games` before unlocking Pong sees an explicit locked-state message; the game is not rendered.
- Parents always have access to `/games` and Pong, without a chore requirement.
- Parents can play before any child unlocks Pong, but see only their personal best. The child leaderboard is hidden until a child has unlocked Pong.

## Pong Experience

- Render the game as a self-contained native `<canvas>` React component. React manages surrounding page state, launch flow, and score presentation.
- Use pointer-only paddle controls: mouse, trackpad, and touch. Do not support keyboard controls.
- Support exactly one active, uninterrupted run. There is no pause control; restart is always available.
- Submit a score only when the player misses the ball and the game ends.
- Show the active score, concise pointer-control instructions, restart control, game-over state, final score, and new-personal-best outcome.
- Scale the canvas to available page width while preserving its aspect ratio and consistent pointer mapping.
- Stop animation when the game ends or its component unmounts.

## Scores And Leaderboard

- Store a single Pong high-score record per user and retain only the user's maximum score.
- The Games endpoint returns the signed-in user's Pong eligibility and personal best. A child's eligibility derives from the existing `ten-chores` badge; a parent is always eligible.
- A score-submission endpoint accepts a game-over score only from an eligible user and returns the resulting personal best.
- Return the Pong leaderboard only to children eligible for Pong. Include only children who are eligible and have recorded a score.
- Exclude parents from the family leaderboard permanently. Parents retain a private personal best.
- The frontend gates navigation and UI from the eligibility response, while the backend authoritatively protects direct access and score submission.
- Scores are browser-submitted and therefore not security-sensitive. They must never affect points, badges, level progression, or other rewards.

## UI

- Preserve the existing dark design system.
- The Games page initially contains one Pong card, the player's personal best, and a launch action.
- Reveal the child leaderboard only when a child has unlocked Pong.
- Future games must fit the same page as additional cards rather than require a separate navigation model.

## Errors And Testing

- If score submission fails, retain the completed run's final score, show an error, and allow retry without replaying.
- Unit-test eligibility for children and parents, protected score submission, high-score-only updates, leaderboard eligibility and parent exclusion.
- Frontend-test Games navigation visibility, locked-route state, leaderboard hiding before the first child unlock, and failure/retry UI.
- Unit-test core Pong rules with deterministic timing, including paddle movement, collisions, scoring, game-over, restart, and animation cleanup.
