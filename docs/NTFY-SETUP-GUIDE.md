# ntfy Push Notification Setup

How to get push notifications working end to end. For the backend implementation details, see [ARCHITECTURE.md](./ARCHITECTURE.md#notification-flow); for env vars, [OPERATIONS.md](./OPERATIONS.md#environment-variables).

## How it works

Chore-Ganizer sends notifications via [ntfy](https://ntfy.sh) — a simple HTTP-based push service. There's exactly one server-level setting (`NTFY_BASE_URL`) and one per-user setting (`ntfyTopic`, set on the Profile page). If `NTFY_BASE_URL` is unset, sends silently no-op — this is intentional, not a bug. If a user's `ntfyTopic` is blank, that user just doesn't get push notifications; it doesn't affect anyone else.

There is no per-event toggle, no quiet hours, no email fallback, and no per-user server override — one topic, one channel, on or off.

## Server setup

Two options:

- **Use ntfy.sh directly** (simplest): set `NTFY_BASE_URL=https://ntfy.sh` in `.env`. No server to run yourself.
- **Self-host**: run the official `binwiederhier/ntfy` Docker image alongside the stack (it is *not* included in this repo's `docker-compose.yml` — add it yourself if you want it), then point `NTFY_BASE_URL` at it, e.g. `http://ntfy:80` if it's on the same Docker network, or `http://your-host:8080` otherwise.

Restart the backend after changing `NTFY_BASE_URL`.

## Per-user topic

Each user sets their own topic on the **Profile** page (there's a "generate a random topic" helper in the UI). Topics are just strings — ntfy topics are public by default, so avoid guessable names like `alice`.

## Receiving notifications on a device

Subscribe to your topic using any ntfy client, pointed at whichever server you configured (`ntfy.sh` or your self-hosted one):

- **iOS/Android**: the [ntfy app](https://docs.ntfy.sh/subscribe/phone/) — add a subscription with your topic name and server.
- **Desktop/browser**: open the server's web UI (e.g. `https://ntfy.sh/your-topic-name`) and subscribe there.
- **CLI test**: `curl -d "test" https://ntfy.sh/your-topic-name` (or your self-hosted URL) — you should see it land wherever you subscribed.

## Troubleshooting

**Notifications never arrive** — confirm `NTFY_BASE_URL` is set (check backend startup logs for `[ntfy] NTFY_BASE_URL not set — notifications disabled`), and confirm the user has a non-blank `ntfyTopic` on their Profile page.

**Notification sent but not received** — the send is fire-and-forget and errors are swallowed server-side by design (a notification failure must never fail the underlying chore-completion request), so check the ntfy server directly: `curl <base-url>/<topic>/json` to see recent messages, or confirm your device is actually subscribed to the exact topic string configured in the app.
