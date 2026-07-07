# Frontend Redesign M1 "The Look" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the frontend from a bland light admin-dashboard into a dark, sleek, teen-appealing app with frontend gamification (confetti, count-up, progress ring, family leaderboard).

**Architecture:** Dark-only design system defined as Tailwind tokens + a small shared component library (`Button`, `Card`, `Avatar`, `ProgressRing`, `CountUp`, etc.). Pages are wrapped in an `AppShell` (top nav on desktop, bottom tab bar on mobile). One backend addition: `GET /api/points/leaderboard`. Spec: `docs/superpowers/specs/2026-07-04-frontend-redesign-design.md`.

**Tech Stack:** React 18 + TypeScript + Tailwind 3 + Vite + Vitest (frontend); Express + Prisma + Jest (backend). New deps: `canvas-confetti`, `@fontsource/inter`, `@fontsource/space-grotesk`.

## Global Constraints

- **Private network / possibly offline:** no CDN assets — fonts self-hosted via `@fontsource` packages only.
- **Dark-only:** no light theme, no theme toggle.
- **Touch targets ≥ 44px** (existing convention, keep it).
- **`prefers-reduced-motion: reduce` disables confetti and count-up** (values render instantly).
- **Keep accessible names/labels stable** where the spec doesn't change copy — existing tests assert on them.
- **API envelope:** `{ success, data, error }` (backend); frontend API mapping lives only in `frontend/src/api/` files.
- **Tests:** frontend `cd frontend && npm test`; backend `cd backend && npm test`. Run the relevant file after every task.
- **Commit after every task** (conventional commits, `feat(m1-XX): ...`).
- Work on branch `feature/m1-the-look` (create from `main` at start).

## Design Token Reference (used throughout — do not improvise)

| Token | Value | Usage |
|---|---|---|
| `bg` | `#09090B` | page background |
| `surface` | `#18181B` | cards |
| `surface-raised` | `#27272A` | modals, dropdowns, inputs |
| `edge` | `#27272A` | all borders |
| `accent` | `#8B5CF6` | primary accent (violet) |
| `accent-to` | `#6366F1` | gradient end (indigo) |
| text primary | `text-zinc-100` | headings, values |
| text secondary | `text-zinc-400` | labels, hints |
| success/danger/warning | `emerald-400` / `rose-400` / `amber-400` text on `*-500/10` bg with `*-500/30` border | badges, alerts |

---

### Task 1: Foundation — deps, design tokens, fonts, base styles

**Files:**
- Modify: `frontend/package.json` (via npm install)
- Modify: `frontend/tailwind.config.js`
- Modify: `frontend/src/index.css`
- Modify: `frontend/src/main.tsx`

**Interfaces:**
- Produces: Tailwind classes `bg-bg`, `bg-surface`, `bg-surface-raised`, `border-edge`, `text-accent`, `from-accent to-accent-to`, `shadow-glow`, `font-display`, `animate-fade-up`; CSS component classes `.input`, `.alert-error`, `.alert-success`. All later tasks use these.

- [ ] **Step 1: Install dependencies**

```bash
cd frontend
npm install canvas-confetti @fontsource/inter @fontsource/space-grotesk
npm install -D @types/canvas-confetti
```

- [ ] **Step 2: Replace `frontend/tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#09090B',
        surface: {
          DEFAULT: '#18181B',
          raised: '#27272A',
        },
        edge: '#27272A',
        accent: {
          DEFAULT: '#8B5CF6',
          to: '#6366F1',
        },
        // Legacy alias kept so unmigrated pages keep compiling mid-milestone.
        primary: {
          DEFAULT: '#8B5CF6',
          hover: '#7C3AED',
          light: 'rgba(139,92,246,0.12)',
          ring: '#8B5CF6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 24px rgba(139, 92, 246, 0.25)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.25s ease-out both',
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 3: Replace `frontend/src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    color-scheme: dark;
  }
  body {
    @apply bg-bg text-zinc-100 antialiased;
  }
}

@layer components {
  .input {
    @apply w-full rounded-xl border border-edge bg-surface-raised px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-accent;
  }
  .alert-error {
    @apply rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-400;
  }
  .alert-success {
    @apply rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400;
  }
}
```

- [ ] **Step 4: Add font imports at the top of `frontend/src/main.tsx`** (before other imports' CSS side effects — place directly under the existing `import './index.css'` line, or above it, order between them doesn't matter):

```ts
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/700.css'
import '@fontsource/space-grotesk/500.css'
import '@fontsource/space-grotesk/700.css'
```

- [ ] **Step 5: Verify build and tests**

```bash
cd frontend && npm run build && npm test
```
Expected: build succeeds; all existing tests still pass (pages still use legacy `primary` alias and their own light classes).

- [ ] **Step 6: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/tailwind.config.js frontend/src/index.css frontend/src/main.tsx
git commit -m "feat(m1-01): dark design tokens, self-hosted fonts, base styles"
```

---

### Task 2: Core primitives — Button, Card, Avatar, StatCard, PageHeader, EmptyState, Skeleton, Toast

**Files:**
- Create: `frontend/src/components/ui/Button.tsx`
- Create: `frontend/src/components/ui/Card.tsx`
- Create: `frontend/src/components/ui/Avatar.tsx`
- Create: `frontend/src/components/ui/StatCard.tsx`
- Create: `frontend/src/components/ui/PageHeader.tsx`
- Create: `frontend/src/components/ui/EmptyState.tsx`
- Create: `frontend/src/components/ui/Skeleton.tsx`
- Create: `frontend/src/components/ui/Toast.tsx`
- Test: `frontend/src/__tests__/ui.test.tsx`

**Interfaces:**
- Produces:
  - `Button({ variant?: 'primary'|'secondary'|'danger'|'ghost', loading?: boolean, ...ButtonHTMLAttributes })`
  - `Card({ children, className? })`
  - `Avatar({ name: string, color: string, size?: 'sm'|'md'|'lg' })`
  - `StatCard({ label: string, children })`
  - `PageHeader({ title: string, action?: ReactNode })`
  - `EmptyState({ icon: LucideIcon, title: string, hint?: string })`
  - `Skeleton({ className? })`
  - `Toast({ kind: 'success'|'error', children })`

- [ ] **Step 1: Write failing tests in `frontend/src/__tests__/ui.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react'
import { Button } from '../components/ui/Button'
import { Avatar } from '../components/ui/Avatar'
import { Toast } from '../components/ui/Toast'

describe('Button', () => {
  it('renders children and is disabled while loading', () => {
    render(<Button loading>Save</Button>)
    const btn = screen.getByRole('button', { name: /save/i })
    expect(btn).toBeDisabled()
  })
})

describe('Avatar', () => {
  it('renders up to two initials from the name', () => {
    render(<Avatar name="Alice Smith" color="#FF0000" />)
    expect(screen.getByText('AS')).toBeInTheDocument()
  })
  it('uses the given color as background', () => {
    render(<Avatar name="Bob" color="#00FF00" />)
    expect(screen.getByText('B')).toHaveStyle({ backgroundColor: '#00FF00' })
  })
})

describe('Toast', () => {
  it('exposes a status role', () => {
    render(<Toast kind="success">Done!</Toast>)
    expect(screen.getByRole('status')).toHaveTextContent('Done!')
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `cd frontend && npm test -- src/__tests__/ui.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Create the components**

`frontend/src/components/ui/Button.tsx`:

```tsx
import { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'

const VARIANT_CLASS: Record<Variant, string> = {
  primary: 'bg-gradient-to-r from-accent to-accent-to text-white shadow-glow hover:opacity-90',
  secondary: 'border border-edge bg-surface text-zinc-200 hover:bg-surface-raised',
  danger: 'border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20',
  ghost: 'text-zinc-400 hover:text-zinc-100',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  loading?: boolean
}

export function Button({ variant = 'primary', loading, disabled, children, className = '', ...rest }: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 ${VARIANT_CLASS[variant]} ${className}`}
      {...rest}
    >
      {loading && (
        <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      )}
      {children}
    </button>
  )
}
```

`frontend/src/components/ui/Card.tsx`:

```tsx
import { ReactNode } from 'react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-edge bg-surface p-4 ${className}`}>{children}</div>
}
```

`frontend/src/components/ui/Avatar.tsx`:

```tsx
interface AvatarProps {
  name: string
  color: string
  size?: 'sm' | 'md' | 'lg'
}

const SIZE_CLASS = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-16 w-16 text-xl',
}

export function Avatar({ name, color, size = 'md' }: AvatarProps) {
  const initials = name
    .split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-display font-bold text-white ${SIZE_CLASS[size]}`}
      style={{ backgroundColor: color }}
    >
      {initials}
    </span>
  )
}
```

`frontend/src/components/ui/StatCard.tsx`:

```tsx
import { ReactNode } from 'react'
import { Card } from './Card'

export function StatCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Card className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wider text-zinc-500">{label}</span>
      <span className="font-display text-3xl font-bold text-zinc-100">{children}</span>
    </Card>
  )
}
```

`frontend/src/components/ui/PageHeader.tsx`:

```tsx
import { ReactNode } from 'react'

export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <h2 className="font-display text-2xl font-bold text-zinc-100">{title}</h2>
      {action}
    </div>
  )
}
```

`frontend/src/components/ui/EmptyState.tsx`:

```tsx
import { LucideIcon } from 'lucide-react'

export function EmptyState({ icon: Icon, title, hint }: { icon: LucideIcon; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center py-12 text-center">
      <Icon aria-hidden className="mb-3 h-10 w-10 text-zinc-600" />
      <p className="font-display font-bold text-zinc-100">{title}</p>
      {hint && <p className="mt-1 text-sm text-zinc-400">{hint}</p>}
    </div>
  )
}
```

`frontend/src/components/ui/Skeleton.tsx`:

```tsx
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-xl bg-surface-raised ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
    </div>
  )
}
```

`frontend/src/components/ui/Toast.tsx`:

```tsx
import { ReactNode } from 'react'

export function Toast({ kind, children }: { kind: 'success' | 'error'; children: ReactNode }) {
  const kindClass =
    kind === 'success'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
      : 'border-rose-500/30 bg-rose-500/10 text-rose-400'
  return (
    <div role="status" className={`fixed right-4 top-4 z-50 animate-fade-up rounded-xl border px-4 py-2 shadow-lg backdrop-blur ${kindClass}`}>
      {children}
    </div>
  )
}
```

- [ ] **Step 4: Run tests**

Run: `cd frontend && npm test -- src/__tests__/ui.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui frontend/src/__tests__/ui.test.tsx
git commit -m "feat(m1-02): core UI primitives (Button, Card, Avatar, StatCard, PageHeader, EmptyState, Skeleton, Toast)"
```

---

### Task 3: Motion components — CountUp, ProgressRing, celebrate()

**Files:**
- Create: `frontend/src/components/ui/CountUp.tsx`
- Create: `frontend/src/components/ui/ProgressRing.tsx`
- Create: `frontend/src/lib/celebrate.ts`
- Test: `frontend/src/__tests__/motion.test.tsx`

**Interfaces:**
- Produces:
  - `CountUp({ value: number, duration?: number, className? })` — renders the number, animated unless reduced motion
  - `ProgressRing({ value: number, max: number, size?: number, label?: string })` — SVG ring with `role="img"` and aria-label `` `${value} of ${max}` `` by default
  - `celebrate(): void` — fires confetti burst; no-op under reduced motion

- [ ] **Step 1: Write failing tests in `frontend/src/__tests__/motion.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { CountUp } from '../components/ui/CountUp'
import { ProgressRing } from '../components/ui/ProgressRing'

// jsdom has no matchMedia — simulate reduced motion so values render instantly.
function mockMatchMedia(reduced: boolean) {
  vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
    matches: reduced && query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })))
  window.matchMedia = globalThis.matchMedia as typeof window.matchMedia
}

describe('CountUp', () => {
  it('renders the final value immediately under reduced motion', () => {
    mockMatchMedia(true)
    render(<CountUp value={42} />)
    expect(screen.getByText('42')).toBeInTheDocument()
  })
})

describe('ProgressRing', () => {
  it('exposes progress via aria-label', () => {
    mockMatchMedia(true)
    render(<ProgressRing value={4} max={6} />)
    expect(screen.getByRole('img', { name: '4 of 6' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `cd frontend && npm test -- src/__tests__/motion.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement**

`frontend/src/components/ui/CountUp.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react'

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

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
```

`frontend/src/components/ui/ProgressRing.tsx`:

```tsx
interface ProgressRingProps {
  value: number
  max: number
  size?: number
  label?: string
}

export function ProgressRing({ value, max, size = 96, label }: ProgressRingProps) {
  const radius = (size - 12) / 2
  const circumference = 2 * Math.PI * radius
  const fraction = max > 0 ? Math.min(value / max, 1) : 0
  const offset = circumference * (1 - fraction)
  return (
    <div className="relative inline-flex items-center justify-center" role="img" aria-label={label ?? `${value} of ${max}`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#27272A" strokeWidth="8" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#progress-ring-gradient)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
        <defs>
          <linearGradient id="progress-ring-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#6366F1" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute font-display font-bold text-zinc-100">
        {value}/{max}
      </span>
    </div>
  )
}
```

`frontend/src/lib/celebrate.ts`:

```ts
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
```

- [ ] **Step 4: Run tests**

Run: `cd frontend && npm test -- src/__tests__/motion.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui/CountUp.tsx frontend/src/components/ui/ProgressRing.tsx frontend/src/lib/celebrate.ts frontend/src/__tests__/motion.test.tsx
git commit -m "feat(m1-03): CountUp, ProgressRing, celebrate() with reduced-motion support"
```

---

### Task 4: Navigation — TopNav, BottomTabBar, AppShell

**Files:**
- Create: `frontend/src/components/TopNav.tsx`
- Create: `frontend/src/components/BottomTabBar.tsx`
- Create: `frontend/src/components/AppShell.tsx`
- Modify: `frontend/src/hooks/useAuth.tsx` (only if its `User` type lacks `color` — see Step 1)
- Test: `frontend/src/__tests__/TopNav.test.tsx`

**Interfaces:**
- Consumes: `useAuth()` → `{ user: { id, name, role, color }, logout }` (from existing hook)
- Produces:
  - `AppShell({ children })` — full page wrapper: dark bg + `<TopNav />` + `<main>` + `<BottomTabBar />`. **All page tasks (7–14) wrap their content in this.**
  - `MANAGE_LINKS` exported from `TopNav.tsx`: `Array<{ to: string; label: string }>` for the four parent pages.
- Note: the old `NavBar.tsx` is left in place until every page is migrated; it is deleted in Task 15.

- [ ] **Step 1: Check that the auth `User` type includes `color`**

Open `frontend/src/hooks/useAuth.tsx`. If the user type does not declare `color: string`, add it (the backend `/api/auth/me` returns the full Prisma user which has `color`). Use `user.color` everywhere below; if TypeScript reveals it's genuinely absent at runtime, fall back with `user.color ?? '#8B5CF6'`.

- [ ] **Step 2: Write failing test `frontend/src/__tests__/TopNav.test.tsx`**

Follow the mock pattern used in the existing `frontend/src/__tests__/NavBar.test.tsx` for mocking `useAuth` (copy its `vi.mock('../hooks/useAuth', ...)` setup verbatim, adjusting user fields as needed).

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { TopNav } from '../components/TopNav'
import { BottomTabBar } from '../components/BottomTabBar'

const mockUseAuth = vi.fn()
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

const parent = { id: 1, name: 'Dad', role: 'PARENT', color: '#3B82F6' }
const child = { id: 2, name: 'Alice', role: 'CHILD', color: '#F59E0B' }

function renderNav(user: typeof parent, ui: React.ReactElement) {
  mockUseAuth.mockReturnValue({ user, logout: vi.fn() })
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('TopNav', () => {
  it('shows Manage dropdown for parents with admin links', async () => {
    renderNav(parent, <TopNav />)
    await userEvent.click(screen.getByRole('button', { name: /manage/i }))
    expect(screen.getByRole('link', { name: /templates/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /users/i })).toBeInTheDocument()
  })

  it('hides Manage for children', () => {
    renderNav(child, <TopNav />)
    expect(screen.queryByRole('button', { name: /manage/i })).not.toBeInTheDocument()
  })
})

describe('BottomTabBar', () => {
  it('renders the five main tabs', () => {
    renderNav(child, <BottomTabBar />)
    for (const label of ['Home', 'Chores', 'Points', 'Calendar', 'Profile']) {
      expect(screen.getByRole('link', { name: new RegExp(label, 'i') })).toBeInTheDocument()
    }
  })
})
```

- [ ] **Step 3: Run to verify failure**

Run: `cd frontend && npm test -- src/__tests__/TopNav.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 4: Create `frontend/src/components/TopNav.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronDown, LogOut } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { Avatar } from './ui/Avatar'

const MAIN_LINKS = [
  { to: '/', label: 'Dashboard' },
  { to: '/my-chores', label: 'My Chores' },
  { to: '/points', label: 'Points' },
  { to: '/calendar', label: 'Calendar' },
]

export const MANAGE_LINKS = [
  { to: '/templates', label: 'Templates' },
  { to: '/recurring-chores', label: 'Recurring' },
  { to: '/assignments', label: 'Assignments' },
  { to: '/users', label: 'Users' },
]

export function TopNav() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [manageOpen, setManageOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const isParent = user?.role === 'PARENT'

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setManageOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  function linkClass(path: string) {
    return location.pathname === path
      ? 'bg-surface-raised text-zinc-100'
      : 'text-zinc-400 hover:text-zinc-100'
  }

  return (
    <nav className="sticky top-0 z-40 border-b border-edge bg-bg/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link
          to="/"
          className="shrink-0 bg-gradient-to-r from-accent to-accent-to bg-clip-text font-display text-xl font-bold text-transparent"
        >
          Chore-Ganizer
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {MAIN_LINKS.map(l => (
            <Link
              key={l.to}
              to={l.to}
              className={`inline-flex min-h-[44px] items-center rounded-xl px-3 text-sm font-medium transition-colors ${linkClass(l.to)}`}
            >
              {l.label}
            </Link>
          ))}
          {isParent && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setManageOpen(o => !o)}
                aria-expanded={manageOpen}
                className="inline-flex min-h-[44px] items-center gap-1 rounded-xl px-3 text-sm font-medium text-zinc-400 hover:text-zinc-100"
              >
                Manage <ChevronDown className="h-4 w-4" aria-hidden />
              </button>
              {manageOpen && (
                <div className="absolute right-0 mt-1 w-44 rounded-xl border border-edge bg-surface-raised py-1 shadow-lg">
                  {MANAGE_LINKS.map(l => (
                    <Link
                      key={l.to}
                      to={l.to}
                      onClick={() => setManageOpen(false)}
                      className="block px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5"
                    >
                      {l.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {user && (
            <Link to="/profile" className="flex min-h-[44px] items-center gap-2 rounded-xl px-2 text-sm text-zinc-300 hover:text-zinc-100">
              <Avatar name={user.name} color={user.color} size="sm" />
              {user.name}
            </Link>
          )}
          <button
            onClick={() => logout()}
            aria-label="Logout"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-zinc-500 hover:text-rose-400"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>

        {/* Mobile: wordmark + logout only; navigation lives in BottomTabBar */}
        <button
          onClick={() => logout()}
          aria-label="Logout"
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-zinc-500 md:hidden"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </nav>
  )
}
```

- [ ] **Step 5: Create `frontend/src/components/BottomTabBar.tsx`**

```tsx
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { CalendarDays, Home, ListChecks, Settings, Star, User } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { MANAGE_LINKS } from './TopNav'

const TABS = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/my-chores', label: 'Chores', icon: ListChecks },
  { to: '/points', label: 'Points', icon: Star },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/profile', label: 'Profile', icon: User },
]

export function BottomTabBar() {
  const { user } = useAuth()
  const location = useLocation()
  const [sheetOpen, setSheetOpen] = useState(false)
  const isParent = user?.role === 'PARENT'

  return (
    <>
      {sheetOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setSheetOpen(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="absolute inset-x-2 bottom-16 animate-fade-up rounded-2xl border border-edge bg-surface-raised p-2"
            onClick={e => e.stopPropagation()}
          >
            {MANAGE_LINKS.map(l => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setSheetOpen(false)}
                className="block rounded-xl px-4 py-3 text-sm text-zinc-200 hover:bg-white/5"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      )}
      <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-50 border-t border-edge bg-bg/90 backdrop-blur md:hidden">
        <div className="grid auto-cols-fr grid-flow-col">
          {TABS.map(t => {
            const active = location.pathname === t.to
            const Icon = t.icon
            return (
              <Link
                key={t.to}
                to={t.to}
                className={`flex min-h-[56px] flex-col items-center gap-0.5 py-2 text-[11px] ${active ? 'text-accent' : 'text-zinc-500'}`}
              >
                <Icon className="h-5 w-5" aria-hidden />
                {t.label}
              </Link>
            )
          })}
          {isParent && (
            <button
              onClick={() => setSheetOpen(o => !o)}
              className={`flex min-h-[56px] flex-col items-center gap-0.5 py-2 text-[11px] ${sheetOpen ? 'text-accent' : 'text-zinc-500'}`}
            >
              <Settings className="h-5 w-5" aria-hidden />
              Manage
            </button>
          )}
        </div>
      </nav>
    </>
  )
}
```

- [ ] **Step 6: Create `frontend/src/components/AppShell.tsx`**

```tsx
import { ReactNode } from 'react'
import { TopNav } from './TopNav'
import { BottomTabBar } from './BottomTabBar'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg pb-20 md:pb-0">
      <TopNav />
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
      <BottomTabBar />
    </div>
  )
}
```

- [ ] **Step 7: Run tests**

Run: `cd frontend && npm test -- src/__tests__/TopNav.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/TopNav.tsx frontend/src/components/BottomTabBar.tsx frontend/src/components/AppShell.tsx frontend/src/__tests__/TopNav.test.tsx frontend/src/hooks/useAuth.tsx
git commit -m "feat(m1-04): TopNav with Manage dropdown, mobile BottomTabBar, AppShell"
```

---

### Task 5: Backend — GET /api/points/leaderboard

**Files:**
- Modify: `backend/src/services/points.service.ts`
- Modify: `backend/src/routes/points.routes.ts`
- Test: `backend/src/__tests__/services/points.service.test.ts` (add to existing file; if it doesn't exist, create it following the prismaMock pattern used by `backend/src/__tests__/services/assignment.service.test.ts`)

**Interfaces:**
- Produces: `getLeaderboard(): Promise<Array<{ user: { id, name, color, role }, balance: number }>>` sorted by balance desc; route `GET /api/points/leaderboard` (authenticate, any role) returning the standard envelope.

- [ ] **Step 1: Write failing test** (add to the existing points service test file, using the project's `prismaMock` import — copy the import lines from a neighboring service test):

```ts
describe('getLeaderboard', () => {
  it('returns all users with balances sorted descending, defaulting to 0', async () => {
    prismaMock.user.findMany.mockResolvedValue([
      { id: 1, name: 'Dad', color: '#3B82F6', role: 'PARENT' },
      { id: 2, name: 'Alice', color: '#F59E0B', role: 'CHILD' },
      { id: 3, name: 'Bob', color: '#10B981', role: 'CHILD' },
    ] as never)
    prismaMock.pointLog.groupBy.mockResolvedValue([
      { userId: 2, _sum: { amount: 120 } },
      { userId: 1, _sum: { amount: 30 } },
    ] as never)

    const result = await pointsService.getLeaderboard()

    expect(result.map(e => e.user.id)).toEqual([2, 1, 3])
    expect(result[0].balance).toBe(120)
    expect(result[2].balance).toBe(0)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `cd backend && npm test -- --testNamePattern="getLeaderboard"`
Expected: FAIL — `getLeaderboard` is not a function.

- [ ] **Step 3: Implement in `backend/src/services/points.service.ts`** (append):

```ts
export async function getLeaderboard() {
  const [users, sums] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, name: true, color: true, role: true },
    }),
    prisma.pointLog.groupBy({
      by: ['userId'],
      _sum: { amount: true },
    }),
  ])
  const balanceByUser = new Map(sums.map(s => [s.userId, s._sum.amount ?? 0]))
  return users
    .map(user => ({ user, balance: balanceByUser.get(user.id) ?? 0 }))
    .sort((a, b) => b.balance - a.balance)
}
```

- [ ] **Step 4: Add route in `backend/src/routes/points.routes.ts`** (before the `/users/:id` route for readability; paths don't conflict):

```ts
router.get('/leaderboard', authenticate, async (_req, res, next) => {
  try {
    const result = await pointsService.getLeaderboard()
    res.json({ success: true, data: result, error: null })
  } catch (err) {
    next(err)
  }
})
```

- [ ] **Step 5: Run tests**

Run: `cd backend && npm test`
Expected: PASS including the new test.

- [ ] **Step 6: Commit**

```bash
git add backend/src/services/points.service.ts backend/src/routes/points.routes.ts backend/src/__tests__/services/points.service.test.ts
git commit -m "feat(m1-05): GET /api/points/leaderboard for family-visible ranking"
```

---

### Task 6: Frontend leaderboard — API, hook, component

**Files:**
- Modify: `frontend/src/api/points.api.ts`
- Modify: `frontend/src/hooks/usePoints.tsx`
- Create: `frontend/src/components/Leaderboard.tsx`
- Test: `frontend/src/__tests__/Leaderboard.test.tsx`

**Interfaces:**
- Consumes: `Avatar`, `Card` from Task 2; endpoint from Task 5.
- Produces:
  - `getLeaderboard(): Promise<LeaderboardEntry[]>` and `export interface LeaderboardEntry { user: { id: number; name: string; color: string; role: string }; balance: number }` in `points.api.ts`
  - `useLeaderboard()` react-query hook (key `['points', 'leaderboard']`)
  - `Leaderboard({ entries: LeaderboardEntry[], limit?: number })` — ranked list, 🥇🥈🥉 for top three

- [ ] **Step 1: Write failing test `frontend/src/__tests__/Leaderboard.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react'
import { Leaderboard } from '../components/Leaderboard'

const entries = [
  { user: { id: 2, name: 'Alice', color: '#F59E0B', role: 'CHILD' }, balance: 120 },
  { user: { id: 1, name: 'Dad', color: '#3B82F6', role: 'PARENT' }, balance: 30 },
  { user: { id: 3, name: 'Bob', color: '#10B981', role: 'CHILD' }, balance: 0 },
]

describe('Leaderboard', () => {
  it('renders entries in given order with balances', () => {
    render(<Leaderboard entries={entries} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('120')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('respects the limit prop', () => {
    render(<Leaderboard entries={entries} limit={2} />)
    expect(screen.queryByText('Bob')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `cd frontend && npm test -- src/__tests__/Leaderboard.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Add API function to `frontend/src/api/points.api.ts`** (append):

```ts
export interface LeaderboardEntry {
  user: { id: number; name: string; color: string; role: string }
  balance: number
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const response = await api.get('/leaderboard')
  return response.data.data
}
```

- [ ] **Step 4: Add hook to `frontend/src/hooks/usePoints.tsx`** (follow the existing hook style in that file — same `useQuery` import and options shape as `useMyPoints`):

```tsx
export function useLeaderboard() {
  return useQuery({
    queryKey: ['points', 'leaderboard'],
    queryFn: getLeaderboard,
  })
}
```

(Import `getLeaderboard` from `../api/points.api` at the top of the file.)

- [ ] **Step 5: Create `frontend/src/components/Leaderboard.tsx`**

```tsx
import { LeaderboardEntry } from '../api/points.api'
import { Avatar } from './ui/Avatar'
import { Card } from './ui/Card'

const MEDALS = ['🥇', '🥈', '🥉']

export function Leaderboard({ entries, limit }: { entries: LeaderboardEntry[]; limit?: number }) {
  const shown = limit ? entries.slice(0, limit) : entries
  return (
    <Card className="divide-y divide-edge p-0">
      {shown.map((entry, i) => (
        <div key={entry.user.id} className="flex items-center gap-3 px-4 py-3">
          <span className="w-6 text-center" aria-hidden>
            {MEDALS[i] ?? <span className="text-sm text-zinc-500">{i + 1}</span>}
          </span>
          <Avatar name={entry.user.name} color={entry.user.color} size="sm" />
          <span className="flex-1 font-medium text-zinc-200">{entry.user.name}</span>
          <span className="font-display font-bold text-zinc-100">
            {entry.balance} <span className="text-xs font-normal text-zinc-500">pts</span>
          </span>
        </div>
      ))}
    </Card>
  )
}
```

- [ ] **Step 6: Run tests**

Run: `cd frontend && npm test -- src/__tests__/Leaderboard.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/api/points.api.ts frontend/src/hooks/usePoints.tsx frontend/src/components/Leaderboard.tsx frontend/src/__tests__/Leaderboard.test.tsx
git commit -m "feat(m1-06): leaderboard API client, hook, and ranked-list component"
```

---

### Task 7: Login page restyle

**Files:**
- Modify: `frontend/src/pages/LoginPage.tsx`
- Test: existing `frontend/src/__tests__/scaffold.test.tsx` (login rendering may be covered there — run whole suite after)

**Interfaces:**
- Consumes: `Button` (Task 2), `.input` / `.alert-error` classes (Task 1). Login logic (`useAuth().login`, navigation) is unchanged.

- [ ] **Step 1: Replace the returned JSX of `LoginPage`** (state and `handleSubmit` stay exactly as they are):

```tsx
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-bg px-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.15),transparent_60%)]"
      />
      <div className="relative w-full max-w-md rounded-2xl border border-edge bg-surface p-8 shadow-glow">
        <div className="mb-8 text-center">
          <LogIn aria-hidden className="mx-auto h-12 w-12 text-accent" />
          <h1 className="mt-4 bg-gradient-to-r from-accent to-accent-to bg-clip-text font-display text-3xl font-bold text-transparent">
            Chore-Ganizer
          </h1>
          <p className="mt-2 text-zinc-400">Sign in to your account</p>
        </div>
        {error && <div className="alert-error mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-zinc-400">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input" required />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-400">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="input" required />
          </div>
          <Button type="submit" loading={isSubmitting} className="w-full">
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  )
```

Add `import { Button } from '../components/ui/Button'` at the top.

- [ ] **Step 2: Run the full frontend suite**

Run: `cd frontend && npm test`
Expected: PASS. If a test asserts on login classes/structure (unlikely — most assert on labels and button text, which are unchanged), update the assertion, never the accessible name.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/LoginPage.tsx
git commit -m "feat(m1-07): dark login page with accent glow"
```

---

### Task 8: Dashboard rebuild

**Files:**
- Modify: `frontend/src/pages/DashboardPage.tsx`
- Test: existing dashboard coverage lives in `frontend/src/__tests__/scaffold.test.tsx` (check with `grep -l Dashboard frontend/src/__tests__/*.tsx`); update whatever file covers it

**Interfaces:**
- Consumes: `AppShell`, `StatCard`, `CountUp`, `ProgressRing`, `Card`, `Avatar`, `EmptyState`, `Skeleton`, `StatusBadge`, `useLeaderboard`, `useMyPoints`, `useAssignments`, `useAuth`.
- Weekly progress definition (from spec): assignments assigned to the current user with `dueDate` in the current **Monday→Sunday** week; done = those with status `COMPLETED`.

- [ ] **Step 1: Replace `frontend/src/pages/DashboardPage.tsx`** (keep the existing `formatDueDate` helper function unchanged — it is reused below):

```tsx
import { useMemo } from 'react'
import { ClipboardList } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useAssignments } from '../hooks/useAssignments'
import { useMyPoints, useLeaderboard } from '../hooks/usePoints'
import { AppShell } from '../components/AppShell'
import { StatusBadge } from '../components/StatusBadge'
import { Leaderboard } from '../components/Leaderboard'
import { Card } from '../components/ui/Card'
import { StatCard } from '../components/ui/StatCard'
import { CountUp } from '../components/ui/CountUp'
import { ProgressRing } from '../components/ui/ProgressRing'
import { EmptyState } from '../components/ui/EmptyState'
import { Skeleton } from '../components/ui/Skeleton'

export function DashboardPage() {
  const { user } = useAuth()
  const { assignments, isLoading, error } = useAssignments()
  const { data: myPoints } = useMyPoints()
  const { data: leaderboard } = useLeaderboard()

  const mine = useMemo(
    () => assignments.filter(a => a.assignedToId === user?.id),
    [assignments, user]
  )

  const upcoming = useMemo(() => {
    return mine
      .filter(a => a.status === 'PENDING')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 5)
  }, [mine])

  const week = useMemo(() => {
    const now = new Date()
    const day = (now.getDay() + 6) % 7 // 0 = Monday
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day)
    const nextMonday = new Date(monday)
    nextMonday.setDate(monday.getDate() + 7)
    const thisWeek = mine.filter(a => {
      const due = new Date(a.dueDate)
      return due >= monday && due < nextMonday
    })
    return {
      total: thisWeek.length,
      done: thisWeek.filter(a => a.status === 'COMPLETED').length,
    }
  }, [mine])

  const dueToday = useMemo(() => {
    const now = new Date()
    return mine.filter(a => {
      const due = new Date(a.dueDate)
      return (
        a.status === 'PENDING' &&
        due.getFullYear() === now.getFullYear() &&
        due.getMonth() === now.getMonth() &&
        due.getDate() === now.getDate()
      )
    }).length
  }, [mine])

  // KEEP the existing formatDueDate helper here, unchanged.

  return (
    <AppShell>
      <div className="mb-6 flex items-center gap-3">
        <h2 className="font-display text-2xl font-bold text-zinc-100">Hey {user?.name} 👋</h2>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Points">
          <CountUp value={myPoints?.balance ?? 0} /> <span className="text-base text-zinc-500">pts</span>
        </StatCard>
        <StatCard label="Due today">{dueToday}</StatCard>
        <Card className="col-span-2 flex items-center justify-between lg:col-span-2">
          <div>
            <span className="text-xs uppercase tracking-wider text-zinc-500">This week</span>
            <p className="mt-1 font-display text-lg font-bold text-zinc-100">
              {week.done} of {week.total} done
            </p>
            <p className="text-sm text-zinc-400">
              {week.total > 0 && week.done === week.total ? 'Week complete — nice! 🎉' : 'Keep it going!'}
            </p>
          </div>
          <ProgressRing value={week.done} max={week.total} size={88} label={`${week.done} of ${week.total}`} />
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <h3 className="mb-4 font-display text-base font-bold text-zinc-100">Upcoming Chores</h3>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : error ? (
            <p className="text-sm text-rose-400">Unable to load upcoming chores.</p>
          ) : upcoming.length === 0 ? (
            <EmptyState icon={ClipboardList} title="No upcoming chores" hint="Enjoy your free time!" />
          ) : (
            <div className="space-y-3">
              {upcoming.map(assignment => {
                const { label: dueLabel, isOverdue } = formatDueDate(assignment.dueDate)
                return (
                  <Card key={assignment.id} className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-zinc-100">{assignment.template.title}</div>
                      <div className="text-sm text-zinc-400">
                        {assignment.template.category && `${assignment.template.category} · `}
                        <span className={isOverdue ? 'font-bold text-rose-400' : ''}>
                          {isOverdue ? 'Overdue' : dueLabel}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={assignment.status} overdue={isOverdue} />
                      <span className="text-sm text-zinc-400">{assignment.template.points} pts</span>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </section>

        <section>
          <h3 className="mb-4 font-display text-base font-bold text-zinc-100">Leaderboard</h3>
          {leaderboard && leaderboard.length > 0 ? (
            <Leaderboard entries={leaderboard} limit={3} />
          ) : (
            <p className="text-sm text-zinc-500">No points earned yet.</p>
          )}
        </section>
      </div>
    </AppShell>
  )
}
```

**Note:** the assignment filter `a.assignedToId === user?.id` was previously inside `upcoming`; it is now hoisted to `mine`. Behavior for upcoming is identical.

- [ ] **Step 2: Update the dashboard test file**

Run: `cd frontend && npm test` — fix failures in the file(s) covering Dashboard:
- Tests mocking `usePoints` must now also provide `useLeaderboard` in the same `vi.mock` factory (return `{ data: [] , isLoading: false }`).
- "Welcome, Alice!" assertions become `/hey alice/i`.
- Assertions on upcoming-chore titles/status badges are unchanged.

- [ ] **Step 3: Run the full frontend suite**

Run: `cd frontend && npm test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/DashboardPage.tsx frontend/src/__tests__/
git commit -m "feat(m1-08): dashboard with stat cards, weekly progress ring, mini leaderboard"
```

---

### Task 9: My Chores — card layout + completion celebration

**Files:**
- Modify: `frontend/src/pages/MyChoresPage.tsx`
- Modify: `frontend/src/__tests__/MyChoresPage.test.tsx`

**Interfaces:**
- Consumes: `AppShell`, `Card`, `Button`, `EmptyState`, `Skeleton`, `Toast`, `StatusBadge`, `FilterBar`, `celebrate()` (Task 3).
- Behavior preserved: filters (status/date), completion flow via `completeAssignment(id, type)`, success/error toasts, 3s auto-dismiss.
- New behavior: `celebrate()` fires after successful completion.

- [ ] **Step 1: Update `handleComplete` to celebrate**

```tsx
  async function handleComplete(id: number, type?: 'REGULAR' | 'RECURRING') {
    setCompleteError(null)
    try {
      await completeAssignment(id, type)
      celebrate()
      setSuccessMessage('Chore marked complete! 🎉')
    } catch {
      setCompleteError('Failed to complete chore.')
    }
  }
```

Add `import { celebrate } from '../lib/celebrate'`.

- [ ] **Step 2: Replace the page chrome and list rendering.** Keep all state, hooks, `currentMonthDates`, `clearFilters`, `filtered`, and `formatDate` unchanged. New render:

```tsx
  if (isLoading) {
    return (
      <AppShell>
        <div className="space-y-3">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </AppShell>
    )
  }

  if (error) {
    return (
      <AppShell>
        <div className="py-12 text-center">
          <h2 className="mb-2 font-display text-2xl font-bold text-zinc-100">Something went wrong</h2>
          <p className="mb-4 text-zinc-400">Unable to load your chores. Check your connection and try again.</p>
          <Button onClick={() => window.location.reload()}>Try again</Button>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <PageHeader title="My Chores" />

      {assignments.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No chores assigned yet"
          hint="A parent needs to assign a chore before it appears here."
        />
      ) : (
        <>
          <FilterBar
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            dateFrom={dateFrom}
            onDateFromChange={setDateFrom}
            dateTo={dateTo}
            onDateToChange={setDateTo}
            onClear={clearFilters}
          />

          {filtered.length === 0 ? (
            <div className="py-8 text-center text-zinc-400">
              No assignments match your filters.{' '}
              <button onClick={clearFilters} className="text-accent hover:underline">
                Clear filters
              </button>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {filtered.map(assignment => {
                const { label: dueDateLabel, isOverdue, isToday } = formatDate(assignment.dueDate)
                const overdue = isOverdue && assignment.status === 'PENDING'
                const completed = assignment.status === 'COMPLETED'
                return (
                  <Card
                    key={assignment.id}
                    className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${
                      overdue ? 'border-rose-500/40' : ''
                    } ${completed ? 'opacity-60' : ''}`}
                  >
                    <div className="min-w-0">
                      <div className={`font-bold text-zinc-100 ${completed ? 'line-through decoration-zinc-500' : ''}`}>
                        {assignment.template.title}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-zinc-400">
                        {assignment.template.category && <span>{assignment.template.category}</span>}
                        <span className={overdue ? 'font-bold text-rose-400' : ''}>
                          {isToday ? 'Today' : dueDateLabel}
                        </span>
                        <StatusBadge status={assignment.status} overdue={overdue} />
                        <span className="font-display font-bold text-accent">{assignment.template.points} pts</span>
                      </div>
                    </div>
                    <div className="shrink-0">
                      {assignment.status === 'PENDING' ? (
                        <Button
                          onClick={() => handleComplete(assignment.id, assignment.type)}
                          loading={isCompleting}
                          className="w-full sm:w-auto"
                        >
                          <CheckCircle2 className="h-4 w-4" aria-hidden />
                          {isCompleting ? 'Completing...' : 'Mark Complete'}
                        </Button>
                      ) : (
                        <span className="text-sm text-zinc-500">Completed</span>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}

      {successMessage && <Toast kind="success">{successMessage}</Toast>}
      {completeError && <Toast kind="error">{completeError}</Toast>}
    </AppShell>
  )
```

Imports to add: `AppShell`, `PageHeader`, `Card`, `Button`, `EmptyState`, `Skeleton`, `Toast` from `../components/...`, `ClipboardList` from `lucide-react`.

- [ ] **Step 3: Update `frontend/src/__tests__/MyChoresPage.test.tsx`**

- Mock `canvas-confetti` at the top so jsdom doesn't choke: `vi.mock('canvas-confetti', () => ({ default: vi.fn() }))`
- The success message is now `Chore marked complete! 🎉` — update the assertion to `/chore marked complete/i`.
- The table-header assertions (`Chore`, `Due Date`, `Status`, `Action` column labels), if present, must be removed — it's a card list now.
- All behavior assertions (filtering, complete button click calls `completeAssignment`) stay.

- [ ] **Step 4: Run tests**

Run: `cd frontend && npm test -- src/__tests__/MyChoresPage.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/MyChoresPage.tsx frontend/src/__tests__/MyChoresPage.test.tsx
git commit -m "feat(m1-09): My Chores card layout with completion confetti"
```

---

### Task 10: Points page — hero balance, leaderboard, history

**Files:**
- Modify: `frontend/src/pages/PointsPage.tsx`
- Modify: `frontend/src/__tests__/PointsPage.test.tsx`

**Interfaces:**
- Consumes: `AppShell`, `PageHeader`, `Card`, `Button`, `CountUp`, `Toast`, `Skeleton`, `Leaderboard`, `useLeaderboard`.
- Behavior preserved: parent-only adjust form with identical validation and messages; history list content.

- [ ] **Step 1: Rework the page.** Keep all state, `handleAdjust`, `resetForm`, `formatDate`, `TYPE_BADGE_CLASS` keys — but replace `TYPE_BADGE_CLASS` values with dark variants:

```tsx
const TYPE_BADGE_CLASS: Record<string, string> = {
  EARNED: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  BONUS: 'bg-sky-500/10 text-sky-400 border border-sky-500/20',
  DEDUCTION: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
  PENALTY: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
  REVERSED: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  ADJUSTMENT: 'bg-violet-500/10 text-violet-400 border border-violet-500/20',
  PAYOUT: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  ADVANCE: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
}
```

Render (loading state uses `Skeleton` inside `AppShell`; error state mirrors Task 9's error block with "Unable to load points."):

```tsx
  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <PageHeader title="My Points" />

        <div className="relative mb-6 overflow-hidden rounded-2xl border border-edge bg-gradient-to-br from-accent/20 via-surface to-surface p-8 text-center shadow-glow">
          <p className="mb-1 text-xs uppercase tracking-wider text-zinc-400">Current Balance</p>
          <p className="font-display text-5xl font-bold text-zinc-100">
            <CountUp value={balance} /> <span className="text-2xl text-accent">pts</span>
          </p>
        </div>

        <h3 className="mb-3 font-display text-base font-bold text-zinc-100">Family Leaderboard</h3>
        {leaderboard && leaderboard.length > 0 ? (
          <div className="mb-6">
            <Leaderboard entries={leaderboard} />
          </div>
        ) : (
          <p className="mb-6 text-sm text-zinc-500">No points earned yet.</p>
        )}

        {isParent && (
          <Card className="mb-6 p-6">
            <h3 className="mb-4 font-display text-lg font-bold text-zinc-100">Adjust Points</h3>
            {/* form unchanged except: selects/inputs get className="input",
                submit button becomes <Button type="submit" loading={adjustMutation.isPending}>,
                clear button becomes <Button type="button" variant="secondary" onClick={resetForm}>Clear</Button>,
                labels become className="mb-1 block text-sm text-zinc-400",
                formError div becomes className="alert-error" */}
          </Card>
        )}

        <Card className="p-0">
          <div className="grid grid-cols-12 gap-4 border-b border-edge px-4 py-3 text-sm text-zinc-500">
            <div className="col-span-3 sm:col-span-2">Date</div>
            <div className="col-span-3 sm:col-span-2">Type</div>
            <div className="col-span-2">Amount</div>
            <div className="col-span-4 sm:col-span-6">Reason</div>
          </div>
          {logs.length === 0 ? (
            <div className="px-4 py-8 text-center text-zinc-500">
              No point history yet. Complete a chore to start earning points!
            </div>
          ) : (
            <div className="divide-y divide-edge">
              {logs.map(log => (
                <div key={log.id} className="grid grid-cols-12 items-center gap-4 px-4 py-3 hover:bg-white/5">
                  <div className="col-span-3 text-sm text-zinc-400 sm:col-span-2">{formatDate(log.createdAt)}</div>
                  <div className="col-span-3 sm:col-span-2">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs ${TYPE_BADGE_CLASS[log.type] ?? 'bg-zinc-500/10 text-zinc-400'}`}>
                      {log.type}
                    </span>
                  </div>
                  <div className={`col-span-2 font-display font-bold ${log.amount > 0 ? 'text-emerald-400' : log.amount < 0 ? 'text-rose-400' : 'text-zinc-100'}`}>
                    {log.amount > 0 ? '+' : ''}{log.amount}
                  </div>
                  <div className="col-span-4 text-sm text-zinc-400 sm:col-span-6">{log.reason}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {successMessage && <Toast kind="success">{successMessage}</Toast>}
    </AppShell>
  )
```

The comment block inside the parent card is an instruction to transform the **existing** form JSX — the form fields, ids, labels text ("User", "Amount", "Reason"), placeholders, and validation messages must remain byte-identical. Add `const { data: leaderboard } = useLeaderboard()` next to the other hooks.

- [ ] **Step 2: Update `frontend/src/__tests__/PointsPage.test.tsx`**

- Add `useLeaderboard` to the `usePoints` mock factory (return `{ data: [], isLoading: false }`).
- Balance may render via `CountUp`; tests should mock reduced motion the same way `motion.test.tsx` does (copy `mockMatchMedia(true)` helper) so the final value renders synchronously, or assert with `findByText`.
- All form-validation and adjust-flow assertions stay unchanged.

- [ ] **Step 3: Run tests**

Run: `cd frontend && npm test -- src/__tests__/PointsPage.test.tsx`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/PointsPage.tsx frontend/src/__tests__/PointsPage.test.tsx
git commit -m "feat(m1-10): points hero card with count-up, family leaderboard, dark history"
```

---

### Task 11: Restyle shared legacy components — StatusBadge, FilterBar, ConfirmDelete

**Files:**
- Modify: `frontend/src/components/StatusBadge.tsx`
- Modify: `frontend/src/components/FilterBar.tsx`
- Modify: `frontend/src/components/ConfirmDelete.tsx`

**Interfaces:** props of all three components are unchanged; visual only.

- [ ] **Step 1: Replace `StatusBadge` class strings** (labels `Overdue` / `Pending` / `Completed` unchanged):

- Overdue: `inline-flex items-center rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-xs text-rose-400`
- Pending: `inline-flex items-center rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs text-amber-400`
- Completed: `inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400`

- [ ] **Step 2: Restyle `FilterBar`** — wrapper becomes `rounded-2xl border border-edge bg-surface p-4 flex flex-wrap items-center gap-3`; every `<select>` and `<input type="date">` gets `className="input !w-auto text-sm"`; the reset button becomes `text-sm text-zinc-400 hover:text-zinc-100`. Options/labels unchanged.

- [ ] **Step 3: Restyle `ConfirmDelete`** using the mechanical conversion table (see Task 12, Step 1) — overlay `bg-black/60`, dialog panel `rounded-2xl border border-edge bg-surface-raised`, confirm button → `<Button variant="danger">`, cancel → `<Button variant="secondary">`. Button labels unchanged.

- [ ] **Step 4: Run the full frontend suite**

Run: `cd frontend && npm test`
Expected: PASS (labels and roles unchanged).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/StatusBadge.tsx frontend/src/components/FilterBar.tsx frontend/src/components/ConfirmDelete.tsx
git commit -m "feat(m1-11): dark StatusBadge, FilterBar, ConfirmDelete"
```

---

### Task 12: Calendar page dark restyle

**Files:**
- Modify: `frontend/src/pages/CalendarPage.tsx`
- Modify: `frontend/src/__tests__/CalendarPage.test.tsx` (only if class-based assertions break)

**Interfaces:** consumes `AppShell`, `PageHeader`, `Card`, `Button`. All calendar logic, data fetching, and accessible names unchanged.

- [ ] **Step 1: Apply the mechanical conversion table to the whole file.** This table is the **single conversion standard** — Tasks 13 and 14 reference it too:

| Old (light) | New (dark) |
|---|---|
| `min-h-screen bg-gray-50` + `<NavBar />` + `<main ...>` wrapper | wrap page content in `<AppShell>` (remove NavBar import/usage and the outer div/main) |
| `<h2 className="text-2xl font-bold ...">Title</h2>` | `<PageHeader title="Title" />` (or `font-display text-2xl font-bold text-zinc-100` if it has siblings) |
| `bg-white rounded-lg shadow-sm p-*` / `shadow-md p-*` | `<Card>` (add `className="p-6"` where it was `p-6`) |
| `text-gray-900` | `text-zinc-100` |
| `text-gray-700` | `text-zinc-300` |
| `text-gray-500` / `text-gray-600` | `text-zinc-400` |
| `text-gray-400` | `text-zinc-500` |
| `border-gray-200` / `border-gray-300` / bare `border` on containers | `border-edge` |
| `divide-y` | `divide-y divide-edge` |
| `bg-gray-50` (header rows, hover) | `bg-white/5` (and `hover:bg-gray-50` → `hover:bg-white/5`) |
| `bg-gray-100` chips | `bg-surface-raised text-zinc-300` |
| form `<input>`/`<select>`/`<textarea>` with `px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-ring` | `className="input"` |
| primary action `<button className="bg-primary ...">` | `<Button>` (keep label/handler; add `loading={...}` where it had a pending state) |
| secondary/cancel `<button className="bg-white border ...">` | `<Button variant="secondary">` |
| destructive buttons (red) | `<Button variant="danger">` |
| `bg-red-50 text-red-600` error boxes | `className="alert-error"` |
| `bg-green-50 text-green-700` success boxes | `className="alert-success"` |
| `text-red-600` inline | `text-rose-400` |
| `text-green-600` inline | `text-emerald-400` |
| `text-primary` links/accents | `text-accent` |
| fixed toasts (`fixed top-4 right-4 ... bg-green-50/bg-red-50 ...`) | `<Toast kind="success">` / `<Toast kind="error">` |
| loading spinner block | `<Skeleton>` blocks sized like the content |

- [ ] **Step 2: Calendar-specific touches**
  - Day cells: default `border-edge bg-surface`; days outside the current month `opacity-40`; **today** gets `ring-2 ring-accent`.
  - Occurrence chips inside day cells keep using the assignee's `user.color` if the page already does so (inline `style={{ backgroundColor }}` or colored dot). If it currently uses static colors, render a small dot: `<span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: assigneeColor }} />` before the title text, where `assigneeColor` comes from the occurrence's assigned user (fallback `'#8B5CF6'`).
  - Month navigation buttons → `<Button variant="ghost">` keeping their aria-labels.

- [ ] **Step 3: Run tests**

Run: `cd frontend && npm test -- src/__tests__/CalendarPage.test.tsx`
Expected: PASS — fix only assertions that referenced removed classes or the NavBar.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/CalendarPage.tsx frontend/src/__tests__/CalendarPage.test.tsx
git commit -m "feat(m1-12): dark calendar with accent today-ring and per-user dots"
```

---

### Task 13: Profile page dark restyle

**Files:**
- Modify: `frontend/src/pages/ProfilePage.tsx`
- Modify: `frontend/src/__tests__/ProfilePage.test.tsx` (only if class-based assertions break)

**Interfaces:** consumes `AppShell`, `PageHeader`, `Card`, `Button`, `Avatar`, `Toast`. All logic (password change, color, ntfy topic incl. "Generate random topic") unchanged.

- [ ] **Step 1: Apply the Task 12 Step 1 conversion table to the whole file.**

- [ ] **Step 2: Profile-specific touches**
  - Add an identity header at the top of the page content: `<div className="mb-6 flex items-center gap-4"><Avatar name={user.name} color={user.color} size="lg" /><div><p className="font-display text-xl font-bold text-zinc-100">{user.name}</p><p className="text-sm text-zinc-400">{user.email}</p></div></div>` (adjust to the fields the page already has in scope).
  - Each settings group (password / color / notifications) becomes its own `<Card className="p-6 mb-6">` with an `h3` styled `font-display text-lg font-bold text-zinc-100 mb-4`.
  - Color swatch buttons keep their behavior; selected swatch gets `ring-2 ring-accent ring-offset-2 ring-offset-surface`.

- [ ] **Step 3: Run tests**

Run: `cd frontend && npm test -- src/__tests__/ProfilePage.test.tsx`
Expected: PASS — fix only style-coupled assertions.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/ProfilePage.tsx frontend/src/__tests__/ProfilePage.test.tsx
git commit -m "feat(m1-13): dark profile page with avatar identity header"
```

---

### Task 14: Parent admin pages dark restyle — Templates, Recurring, Assignments, Users

**Files:**
- Modify: `frontend/src/pages/TemplatesPage.tsx` + `frontend/src/__tests__/TemplatesPage.test.tsx`
- Modify: `frontend/src/pages/RecurringChoresPage.tsx` + `frontend/src/__tests__/RecurringChoresPage.test.tsx`
- Modify: `frontend/src/pages/AssignmentsPage.tsx` + `frontend/src/__tests__/AssignmentsPage.test.tsx`
- Modify: `frontend/src/pages/UsersPage.tsx` + `frontend/src/__tests__/UsersPage.test.tsx`

**Interfaces:** consumes `AppShell`, `PageHeader`, `Card`, `Button`, `Toast`, `EmptyState`, `Skeleton`, `Avatar` (Users page rows get an `Avatar` next to each name). Zero functional changes: every handler, form field, validation message, modal, and accessible name stays identical.

- [ ] **Step 1: TemplatesPage — apply the Task 12 Step 1 conversion table; run its test file; commit** `feat(m1-14a): dark templates page`

- [ ] **Step 2: RecurringChoresPage — same table; run its test file; commit** `feat(m1-14b): dark recurring chores page`

- [ ] **Step 3: AssignmentsPage — same table; run its test file; commit** `feat(m1-14c): dark assignments page`

- [ ] **Step 4: UsersPage — same table, plus `<Avatar name={u.name} color={u.color} size="sm" />` before each user's name in the list; run its test file; commit** `feat(m1-14d): dark users page with avatars`

For each page: `cd frontend && npm test -- src/__tests__/<PageName>.test.tsx` must PASS before its commit; fix only style-coupled assertions.

---

### Task 15: Cleanup, full verification, E2E

**Files:**
- Delete: `frontend/src/components/NavBar.tsx`, `frontend/src/__tests__/NavBar.test.tsx`
- Modify: `frontend/tailwind.config.js` (remove the legacy `primary` alias)
- Possibly modify: `e2e/*.spec.ts` (selectors referencing the old nav)

- [ ] **Step 1: Confirm nothing imports NavBar anymore**

Run: `grep -rn "NavBar" frontend/src --include="*.tsx" | grep -v BottomTabBar`
Expected: only `NavBar.tsx` itself and its test. Then delete both files.

- [ ] **Step 2: Remove the legacy `primary` color block from `tailwind.config.js`**

Run: `grep -rn "primary" frontend/src --include="*.tsx"` first — if any page still uses `bg-primary`/`text-primary`/`ring-primary-ring`, convert those occurrences per the Task 12 table, then delete the `primary` block from the config.

- [ ] **Step 3: Full frontend + backend suites**

```bash
cd frontend && npm run build && npm test
cd ../backend && npm test
```
Expected: all PASS, build clean.

- [ ] **Step 4: E2E**

Start the app (dev servers or docker), then from repo root: `npm run test:e2e`. Fix selectors that referenced the old nav (e.g., mobile hamburger `aria-label="Open menu"` no longer exists — mobile nav is the bottom tab bar links).

- [ ] **Step 5: Manual visual pass**

Load the app at 390px width (phone) and desktop width. Check: bottom tab bar present on phone with active tab highlighted; Manage sheet works for a parent login; completing a chore fires confetti and the toast; points page count-up runs; leaderboard shows all four seeded users; contrast is comfortable on every page.

- [ ] **Step 6: Commit + log work**

```bash
git add -A
git commit -m "feat(m1-15): remove legacy NavBar and primary alias, e2e fixes"
```

Add a completion entry to `docs/project_notes/issues.md` (date, "M1 The Look — dark redesign + frontend gamification, all pages").

- [ ] **Step 7: Version bump (release prep)**

Bump the minor version identically in `backend/package.json` and `frontend/package.json` (e.g., `3.2.0`), and update `APP_VERSION` in `.env` to match, per the project's version-management workflow (`./docker-compose.sh` auto-reads it for builds). Commit as `chore: bump version for M1 release`.

---

## Out of Scope (Milestone 2 — planned separately after M1 ships)

Backend streaks, levels, badges, and their UI. Prerequisite for M2: the duplicate `dueNotifiedAt` fields in `backend/prisma/schema.prisma` must be fixed first (already flagged as a separate task).
