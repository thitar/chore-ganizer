# UI Modernization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernize the UI with a dark slate sidebar, indigo accent colors, Plus Jakarta Sans font, a mobile-responsive layout shell with hamburger drawer, and updated common components (Button, Input, Modal).

**Architecture:** Update design tokens in `tailwind.config.js` and `index.css` first, then update the layout shell (Navbar + Sidebar) to the new responsive design, then update the three common components. Each task is independently testable and committable.

**Tech Stack:** React 18, TypeScript, Tailwind CSS v3, Vitest, @testing-library/react

---

## File Map

| File | Change |
|---|---|
| `frontend/tailwind.config.js` | Add sidebar/primary/surface/border tokens + Plus Jakarta Sans font |
| `frontend/src/index.css` | Update font-family, body background, base text color |
| `frontend/src/components/layout/Navbar.tsx` | New dark navbar with mobile hamburger trigger |
| `frontend/src/components/layout/Navbar.test.tsx` | Update tests for new markup |
| `frontend/src/components/layout/Sidebar.tsx` | Dark sidebar, SVG icons replacing emoji, mobile drawer support |
| `frontend/src/components/layout/Sidebar.test.tsx` | Update tests for new markup (no more emoji icon tests) |
| `frontend/src/components/common/Button.tsx` | New indigo/outlined-secondary/outlined-danger/ghost variants |
| `frontend/src/components/common/Button.test.tsx` | Update class assertions to new tokens |
| `frontend/src/components/common/Input.tsx` | Softer border, red-bg error state, font-semibold label |
| `frontend/src/components/common/Input.test.tsx` | Update class assertions to new tokens |
| `frontend/src/components/common/Modal.tsx` | Rounder corners, softer shadow, icon close button in pill |
| `frontend/src/components/common/Modal.test.tsx` | Update selector for new modal container classes |

---

## Task 1: Design Tokens (tailwind.config.js + index.css)

**Files:**
- Modify: `frontend/tailwind.config.js`
- Modify: `frontend/src/index.css`

These tasks have no tests — verify visually after docker compose up.

- [ ] **Step 1: Update tailwind.config.js**

Replace the entire file content:

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
        sidebar: {
          DEFAULT: '#1e293b',
          foreground: '#94a3b8',
          active: '#f1f5f9',
          border: '#0f172a',
        },
        primary: {
          DEFAULT: '#4f46e5',
          hover: '#4338ca',
          light: '#eff6ff',
          ring: '#6366f1',
        },
        surface: {
          DEFAULT: '#ffffff',
          muted: '#f8fafc',
        },
        border: {
          DEFAULT: '#e2e8f0',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 2: Update index.css**

Replace the entire file content:

```css
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  font-family: 'Plus Jakarta Sans', Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;

  color-scheme: light;
  color: #0f172a;
  background-color: #f8fafc;

  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
}

#root {
  min-height: 100vh;
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/tailwind.config.js frontend/src/index.css
git commit -m "feat(ui): add design tokens and Plus Jakarta Sans font"
```

---

## Task 2: Sidebar — dark background, SVG icons, mobile drawer

**Files:**
- Modify: `frontend/src/components/layout/Sidebar.tsx`
- Modify: `frontend/src/components/layout/Sidebar.test.tsx`

The Sidebar needs to:
1. Use the dark `sidebar` token (`bg-sidebar`) instead of white
2. Replace emoji icons with inline SVGs
3. Accept an `isOpen` prop and an `onClose` callback for the mobile drawer
4. On mobile (`lg:` breakpoint), render as a fixed overlay drawer; on desktop it renders inline

- [ ] **Step 1: Update Sidebar.tsx**

```tsx
import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks'

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

const DashboardIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
  </svg>
)

const CalendarIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
)

const ChoresIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
  </svg>
)

const RecurringIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
  </svg>
)

const TemplatesIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
  </svg>
)

const UsersIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
  </svg>
)

const PocketMoneyIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <line x1="12" y1="1" x2="12" y2="23"/>
    <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
  </svg>
)

const StatisticsIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/>
  </svg>
)

const ICON_MAP: Record<string, React.FC> = {
  dashboard: DashboardIcon,
  calendar: CalendarIcon,
  chores: ChoresIcon,
  'recurring-chores': RecurringIcon,
  templates: TemplatesIcon,
  users: UsersIcon,
  'pocket-money': PocketMoneyIcon,
  statistics: StatisticsIcon,
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const { isParent } = useAuth()
  const location = useLocation()

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard' },
    ...(isParent ? [{ id: 'calendar', label: 'Family Calendar' }] : []),
    { id: 'chores', label: 'Chores' },
    { id: 'recurring-chores', label: 'Recurring Chores' },
    ...(isParent ? [{ id: 'templates', label: 'Chore Definitions' }] : []),
    ...(isParent ? [{ id: 'users', label: 'Family Members' }] : []),
    { id: 'pocket-money', label: 'Pocket Money' },
    ...(isParent ? [{ id: 'statistics', label: 'Statistics' }] : []),
  ]

  const nav = (
    <aside className="w-64 bg-sidebar min-h-screen flex-shrink-0 border-r border-sidebar-border">
      <div className="p-3 pt-4">
        <div className="text-sidebar-foreground text-xs font-bold uppercase tracking-widest px-3 pb-3">
          Menu
        </div>
        <nav className="space-y-0.5">
          {menuItems.map((item) => {
            const Icon = ICON_MAP[item.id]
            const isActive = location.pathname === `/${item.id}`
            return (
              <Link
                key={item.id}
                to={`/${item.id}`}
                onClick={onClose}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium
                  transition-colors duration-150
                  ${isActive
                    ? 'bg-primary text-white'
                    : 'text-sidebar-foreground hover:bg-white/10 hover:text-sidebar-active'}
                `}
              >
                {Icon && <Icon />}
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </aside>
  )

  // Mobile: overlay drawer
  if (typeof window !== 'undefined') {
    return (
      <>
        {/* Desktop: always visible */}
        <div className="hidden lg:block">{nav}</div>

        {/* Mobile: overlay drawer */}
        {isOpen && (
          <div className="lg:hidden fixed inset-0 z-40 flex">
            <div
              className="fixed inset-0 bg-black/40"
              onClick={onClose}
              aria-hidden="true"
            />
            <div className="relative z-50">{nav}</div>
          </div>
        )}
      </>
    )
  }

  return nav
}
```

- [ ] **Step 2: Update Sidebar.test.tsx**

Replace the entire file:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '../../test/utils'
import { fireEvent } from '@testing-library/react'

vi.mock('../../hooks', () => ({
  useAuth: vi.fn(),
}))

import { useAuth } from '../../hooks'
const mockUseAuth = useAuth as ReturnType<typeof vi.fn>

import { Sidebar } from './Sidebar'

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders common menu items for parent', () => {
    mockUseAuth.mockReturnValue({ isParent: true })
    render(<Sidebar />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Chores')).toBeInTheDocument()
    expect(screen.getByText('Recurring Chores')).toBeInTheDocument()
    expect(screen.getByText('Pocket Money')).toBeInTheDocument()
  })

  it('renders parent-only menu items for parent', () => {
    mockUseAuth.mockReturnValue({ isParent: true })
    render(<Sidebar />)
    expect(screen.getByText('Family Calendar')).toBeInTheDocument()
    expect(screen.getByText('Chore Definitions')).toBeInTheDocument()
    expect(screen.getByText('Family Members')).toBeInTheDocument()
  })

  it('renders common menu items for child', () => {
    mockUseAuth.mockReturnValue({ isParent: false })
    render(<Sidebar />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Chores')).toBeInTheDocument()
    expect(screen.getByText('Recurring Chores')).toBeInTheDocument()
    expect(screen.getByText('Pocket Money')).toBeInTheDocument()
  })

  it('does not render parent-only menu items for child', () => {
    mockUseAuth.mockReturnValue({ isParent: false })
    render(<Sidebar />)
    expect(screen.queryByText('Family Calendar')).not.toBeInTheDocument()
    expect(screen.queryByText('Chore Definitions')).not.toBeInTheDocument()
    expect(screen.queryByText('Family Members')).not.toBeInTheDocument()
  })

  it('renders links with correct hrefs', () => {
    mockUseAuth.mockReturnValue({ isParent: true })
    render(<Sidebar />)
    expect(screen.getAllByText('Dashboard')[0].closest('a')).toHaveAttribute('href', '/dashboard')
    expect(screen.getAllByText('Chores')[0].closest('a')).toHaveAttribute('href', '/chores')
    expect(screen.getAllByText('Pocket Money')[0].closest('a')).toHaveAttribute('href', '/pocket-money')
  })

  it('calls onClose when a link is clicked', () => {
    mockUseAuth.mockReturnValue({ isParent: false })
    const onClose = vi.fn()
    render(<Sidebar isOpen={true} onClose={onClose} />)
    fireEvent.click(screen.getAllByText('Dashboard')[0])
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when backdrop is clicked (mobile drawer)', () => {
    mockUseAuth.mockReturnValue({ isParent: false })
    const onClose = vi.fn()
    const { container } = render(<Sidebar isOpen={true} onClose={onClose} />)
    const backdrop = container.querySelector('.bg-black\\/40')
    if (backdrop) {
      fireEvent.click(backdrop)
      expect(onClose).toHaveBeenCalledTimes(1)
    }
  })
})
```

- [ ] **Step 3: Run tests**

```bash
cd frontend && npm test -- src/components/layout/Sidebar.test.tsx
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/layout/Sidebar.tsx frontend/src/components/layout/Sidebar.test.tsx
git commit -m "feat(ui): dark sidebar with SVG icons and mobile drawer support"
```

---

## Task 3: Navbar — dark, mobile hamburger button

**Files:**
- Modify: `frontend/src/components/layout/Navbar.tsx`
- Modify: `frontend/src/components/layout/Navbar.test.tsx`

The Navbar needs to:
1. Use `bg-sidebar` (dark slate) background
2. Add a hamburger `<button>` visible only on mobile (`lg:hidden`) that calls an `onMenuOpen` prop
3. Keep all existing functionality (notifications, user avatar, logout, points)

- [ ] **Step 1: Update Navbar.tsx**

```tsx
import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks'
import { Button } from '../common'
import { notificationsApi } from '../../api'
import { NOTIFICATION_POLL_INTERVAL_MS } from '../../constants'

interface NavbarProps {
  onMenuOpen?: () => void
}

export const Navbar: React.FC<NavbarProps> = ({ onMenuOpen }) => {
  const { user, logout, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [unreadCount, setUnreadCount] = useState(0)

  const loadUnreadCount = useCallback(async () => {
    try {
      const response = await notificationsApi.getAll({ unreadOnly: true })
      setUnreadCount(response.data.notifications.length)
    } catch (err) {
      console.error('Failed to load notification count:', err)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      loadUnreadCount()
      const interval = setInterval(loadUnreadCount, NOTIFICATION_POLL_INTERVAL_MS)
      return () => clearInterval(interval)
    }
  }, [isAuthenticated, loadUnreadCount])

  if (!isAuthenticated) {
    return null
  }

  return (
    <nav className="bg-sidebar border-b border-sidebar-border">
      <div className="px-4 sm:px-6">
        <div className="flex justify-between h-14">
          <div className="flex items-center gap-3">
            {/* Hamburger — mobile only */}
            <button
              className="lg:hidden flex flex-col gap-1.5 p-1.5 text-sidebar-foreground hover:text-sidebar-active transition-colors"
              onClick={onMenuOpen}
              aria-label="Open menu"
            >
              <span className="block w-5 h-0.5 bg-current rounded-full" />
              <span className="block w-5 h-0.5 bg-current rounded-full" />
              <span className="block w-5 h-0.5 bg-current rounded-full" />
            </button>
            <h1 className="text-base font-bold text-sidebar-active tracking-tight">Chore-Ganizer</h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Notification Bell */}
            <button
              className="relative p-1.5 text-sidebar-foreground hover:text-sidebar-active transition-colors"
              onClick={() => navigate('/notifications')}
              aria-label="Notifications"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Points */}
            <div className="hidden sm:flex items-center gap-1.5">
              <span className="text-xs text-sidebar-foreground">Points:</span>
              <span className="text-xs font-bold text-primary-ring">{user?.points}</span>
            </div>

            {/* User avatar */}
            <div
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => navigate('/profile')}
            >
              <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center text-white text-xs font-bold">
                {user?.name.charAt(0).toUpperCase()}
              </div>
              <span className="hidden sm:block text-sm font-medium text-sidebar-foreground hover:text-sidebar-active">
                {user?.name}
              </span>
            </div>

            <Button variant="ghost" size="sm" onClick={logout}
              className="text-sidebar-foreground hover:text-sidebar-active hover:bg-white/10">
              Logout
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Update Navbar.test.tsx**

Replace the entire file:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '../../test/utils'
import { Navbar } from './Navbar'

vi.mock('../../hooks', () => ({
  useAuth: vi.fn(),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

import { useAuth } from '../../hooks'
const mockUseAuth = useAuth as ReturnType<typeof vi.fn>

describe('Navbar', () => {
  const mockLogout = vi.fn()

  beforeEach(() => {
    mockNavigate.mockClear()
    mockLogout.mockClear()
  })

  it('does not render when not authenticated', () => {
    mockUseAuth.mockReturnValue({ user: null, logout: mockLogout, isAuthenticated: false })
    render(<Navbar />)
    expect(screen.queryByText('Chore-Ganizer')).not.toBeInTheDocument()
  })

  it('renders when authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, name: 'Test User', points: 100, role: 'PARENT' },
      logout: mockLogout,
      isAuthenticated: true,
    })
    render(<Navbar />)
    expect(screen.getByText('Chore-Ganizer')).toBeInTheDocument()
  })

  it('displays user name', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, name: 'Test User', points: 100, role: 'PARENT' },
      logout: mockLogout,
      isAuthenticated: true,
    })
    render(<Navbar />)
    expect(screen.getByText('Test User')).toBeInTheDocument()
  })

  it('displays user points', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, name: 'Test User', points: 100, role: 'PARENT' },
      logout: mockLogout,
      isAuthenticated: true,
    })
    render(<Navbar />)
    expect(screen.getByText('100')).toBeInTheDocument()
  })

  it('displays user initial in avatar', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, name: 'Test User', points: 100, role: 'PARENT' },
      logout: mockLogout,
      isAuthenticated: true,
    })
    render(<Navbar />)
    expect(screen.getByText('T')).toBeInTheDocument()
  })

  it('calls logout when logout button is clicked', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, name: 'Test User', points: 100, role: 'PARENT' },
      logout: mockLogout,
      isAuthenticated: true,
    })
    render(<Navbar />)
    fireEvent.click(screen.getByText('Logout'))
    expect(mockLogout).toHaveBeenCalledTimes(1)
  })

  it('navigates to profile when user info is clicked', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, name: 'Test User', points: 100, role: 'PARENT' },
      logout: mockLogout,
      isAuthenticated: true,
    })
    render(<Navbar />)
    fireEvent.click(screen.getByText('Test User'))
    expect(mockNavigate).toHaveBeenCalledWith('/profile')
  })

  it('calls onMenuOpen when hamburger is clicked', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, name: 'Test User', points: 100, role: 'PARENT' },
      logout: mockLogout,
      isAuthenticated: true,
    })
    const onMenuOpen = vi.fn()
    render(<Navbar onMenuOpen={onMenuOpen} />)
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))
    expect(onMenuOpen).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 3: Run tests**

```bash
cd frontend && npm test -- src/components/layout/Navbar.test.tsx
```

Expected: all tests pass.

- [ ] **Step 4: Wire up Navbar + Sidebar in App shell**

Find the layout wrapper in `frontend/src/App.tsx` (or wherever Navbar and Sidebar are rendered together) and add the `useState` for drawer open state:

```tsx
// In the component that renders both Navbar and Sidebar:
const [sidebarOpen, setSidebarOpen] = useState(false)

// Pass to Navbar:
<Navbar onMenuOpen={() => setSidebarOpen(true)} />

// Pass to Sidebar:
<Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/layout/Navbar.tsx frontend/src/components/layout/Navbar.test.tsx frontend/src/App.tsx
git commit -m "feat(ui): dark navbar with mobile hamburger, wire up sidebar drawer"
```

---

## Task 4: Button — new indigo/outlined/ghost variants

**Files:**
- Modify: `frontend/src/components/common/Button.tsx`
- Modify: `frontend/src/components/common/Button.test.tsx`

Changes from brainstorm:
- `primary`: `bg-primary` (indigo-600) replacing blue
- `secondary`: slate background + border, not plain gray
- `danger`: outlined red (bg + border) instead of solid red
- `ghost`: slate-500 text, same transparent bg

- [ ] **Step 1: Update Button.tsx**

```tsx
import React from 'react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  children: React.ReactNode
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-semibold rounded-md tracking-tight transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

  const variantStyles = {
    primary: 'bg-primary text-white hover:bg-primary-hover focus:ring-primary-ring',
    secondary: 'bg-surface-muted text-slate-900 border border-border hover:bg-slate-100 focus:ring-slate-400',
    danger: 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 focus:ring-red-400',
    ghost: 'bg-transparent text-slate-500 hover:bg-slate-100 focus:ring-slate-400',
  }

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  }

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  )
}
```

- [ ] **Step 2: Update Button.test.tsx**

Replace the entire file:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from './Button'

describe('Button', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('applies primary variant by default', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-primary')
  })

  it('applies secondary variant when specified', () => {
    render(<Button variant="secondary">Click me</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-surface-muted')
  })

  it('applies danger variant when specified', () => {
    render(<Button variant="danger">Click me</Button>)
    const btn = screen.getByRole('button')
    expect(btn).toHaveClass('bg-red-50')
    expect(btn).toHaveClass('text-red-600')
  })

  it('applies ghost variant when specified', () => {
    render(<Button variant="ghost">Click me</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-transparent')
  })

  it('is disabled when loading', () => {
    render(<Button loading>Click me</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('shows loading spinner when loading', () => {
    render(<Button loading>Click me</Button>)
    expect(screen.getByRole('button').querySelector('svg')).toBeInTheDocument()
  })

  it('calls onClick handler when clicked', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    screen.getByRole('button').click()
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 3: Run tests**

```bash
cd frontend && npm test -- src/components/common/Button.test.tsx
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/common/Button.tsx frontend/src/components/common/Button.test.tsx
git commit -m "feat(ui): update Button variants to indigo primary and outlined danger/secondary"
```

---

## Task 5: Input — softer border, red-bg error state

**Files:**
- Modify: `frontend/src/components/common/Input.tsx`
- Modify: `frontend/src/components/common/Input.test.tsx`

Changes from brainstorm:
- Normal border: `border-border` (slate-200) instead of gray-300
- Error border: `border-red-300` with `bg-red-50` background tint on the input itself
- Label: `font-semibold text-slate-900` instead of `font-medium text-gray-700`

- [ ] **Step 1: Update Input.tsx**

```tsx
import React from 'react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-slate-900 mb-1">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full px-3 py-2.5 border rounded-md text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary-ring focus:border-transparent ${
          error
            ? 'border-red-300 bg-red-50'
            : 'border-border'
        } ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 2: Update Input.test.tsx**

Replace the entire file:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '../../test/utils'
import { Input } from './Input'

describe('Input', () => {
  it('renders input element', () => {
    render(<Input />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('renders label when provided', () => {
    render(<Input label="Email" />)
    expect(screen.getByText('Email')).toBeInTheDocument()
  })

  it('does not render label when not provided', () => {
    render(<Input />)
    expect(screen.queryByRole('label')).not.toBeInTheDocument()
  })

  it('renders error message when provided', () => {
    render(<Input error="This field is required" />)
    expect(screen.getByText('This field is required')).toBeInTheDocument()
  })

  it('applies error border and background when error is provided', () => {
    render(<Input error="Error" />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveClass('border-red-300')
    expect(input).toHaveClass('bg-red-50')
  })

  it('applies normal border when no error', () => {
    render(<Input />)
    expect(screen.getByRole('textbox')).toHaveClass('border-border')
  })

  it('handles value changes', () => {
    const handleChange = vi.fn()
    render(<Input onChange={handleChange} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'test value' } })
    expect(handleChange).toHaveBeenCalled()
  })

  it('applies custom className', () => {
    render(<Input className="custom-class" />)
    expect(screen.getByRole('textbox')).toHaveClass('custom-class')
  })

  it('uses id prop for input', () => {
    render(<Input id="custom-id" label="Test" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('id', 'custom-id')
  })

  it('generates id from label if id not provided', () => {
    render(<Input label="Email Address" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('id', 'email-address')
  })

  it('supports different input types', () => {
    render(<Input type="password" />)
    const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement
    expect(passwordInput.type).toBe('password')
  })

  it('supports placeholder', () => {
    render(<Input placeholder="Enter email" />)
    expect(screen.getByPlaceholderText('Enter email')).toBeInTheDocument()
  })

  it('can be disabled', () => {
    render(<Input disabled />)
    expect(screen.getByRole('textbox')).toBeDisabled()
  })

  it('supports required attribute', () => {
    render(<Input required />)
    expect(screen.getByRole('textbox')).toBeRequired()
  })
})
```

- [ ] **Step 3: Run tests**

```bash
cd frontend && npm test -- src/components/common/Input.test.tsx
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/common/Input.tsx frontend/src/components/common/Input.test.tsx
git commit -m "feat(ui): update Input with softer border and red-bg error state"
```

---

## Task 6: Modal — rounder corners, softer shadow, icon close button

**Files:**
- Modify: `frontend/src/components/common/Modal.tsx`
- Modify: `frontend/src/components/common/Modal.test.tsx`

Changes from brainstorm:
- Modal panel: `rounded-xl` (was `rounded-lg`), custom soft shadow (`shadow-[0_8px_30px_rgba(15,23,42,0.12),0_0_0_1px_rgba(15,23,42,0.06)]`)
- Header divider: `border-surface-muted` (lighter)
- Close button: icon wrapped in a small rounded pill (`bg-surface-muted rounded-md w-7 h-7`) instead of bare ✕ text

- [ ] **Step 1: Update Modal.tsx**

```tsx
import React, { useEffect } from 'react'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  const sizeStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />
      <div
        className={`relative bg-white rounded-xl shadow-[0_8px_30px_rgba(15,23,42,0.12),0_0_0_1px_rgba(15,23,42,0.06)] ${sizeStyles[size]} w-full mx-4 max-h-[90vh] overflow-y-auto`}
      >
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-muted">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Close modal"
              className="w-7 h-7 flex items-center justify-center rounded-md bg-surface-muted hover:bg-slate-200 transition-colors"
            >
              <svg width="14" height="14" fill="none" stroke="#64748b" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update Modal.test.tsx**

Replace the entire file:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '../../test/utils'
import { Modal } from './Modal'

describe('Modal', () => {
  const mockOnClose = vi.fn()

  beforeEach(() => {
    mockOnClose.mockClear()
  })

  afterEach(() => {
    document.body.style.overflow = 'unset'
  })

  it('does not render when closed', () => {
    render(<Modal isOpen={false} onClose={mockOnClose}><div>Modal Content</div></Modal>)
    expect(screen.queryByText('Modal Content')).not.toBeInTheDocument()
  })

  it('renders when open', () => {
    render(<Modal isOpen={true} onClose={mockOnClose}><div>Modal Content</div></Modal>)
    expect(screen.getByText('Modal Content')).toBeInTheDocument()
  })

  it('renders title when provided', () => {
    render(<Modal isOpen={true} onClose={mockOnClose} title="Test Modal"><div>Content</div></Modal>)
    expect(screen.getByText('Test Modal')).toBeInTheDocument()
  })

  it('calls onClose when backdrop is clicked', () => {
    render(<Modal isOpen={true} onClose={mockOnClose}><div>Content</div></Modal>)
    const backdrop = screen.getByText('Content').closest('.fixed.inset-0.z-50')
      ?.querySelector('.fixed.inset-0.bg-black\\/50')
    if (backdrop) {
      fireEvent.click(backdrop)
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    }
  })

  it('calls onClose when close button is clicked', () => {
    render(<Modal isOpen={true} onClose={mockOnClose} title="Test Modal"><div>Content</div></Modal>)
    fireEvent.click(screen.getByRole('button', { name: 'Close modal' }))
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('sets body overflow to hidden when open', () => {
    render(<Modal isOpen={true} onClose={mockOnClose}><div>Content</div></Modal>)
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('resets body overflow when closed', () => {
    const { rerender } = render(
      <Modal isOpen={true} onClose={mockOnClose}><div>Content</div></Modal>
    )
    expect(document.body.style.overflow).toBe('hidden')
    rerender(<Modal isOpen={false} onClose={mockOnClose}><div>Content</div></Modal>)
    expect(document.body.style.overflow).toBe('unset')
  })

  it('applies size classes correctly', () => {
    const { rerender, container } = render(
      <Modal isOpen={true} onClose={mockOnClose} size="sm"><div>Content</div></Modal>
    )
    const panel = container.querySelector('.bg-white.rounded-xl')
    expect(panel).toHaveClass('max-w-sm')

    rerender(<Modal isOpen={true} onClose={mockOnClose} size="lg"><div>Content</div></Modal>)
    expect(container.querySelector('.bg-white.rounded-xl')).toHaveClass('max-w-lg')

    rerender(<Modal isOpen={true} onClose={mockOnClose} size="xl"><div>Content</div></Modal>)
    expect(container.querySelector('.bg-white.rounded-xl')).toHaveClass('max-w-xl')
  })

  it('renders children correctly', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose}>
        <p>Paragraph 1</p>
        <p>Paragraph 2</p>
        <button>Action Button</button>
      </Modal>
    )
    expect(screen.getByText('Paragraph 1')).toBeInTheDocument()
    expect(screen.getByText('Paragraph 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Action Button' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run tests**

```bash
cd frontend && npm test -- src/components/common/Modal.test.tsx
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/common/Modal.tsx frontend/src/components/common/Modal.test.tsx
git commit -m "feat(ui): update Modal with rounder corners, soft shadow, icon close button"
```

---

## Task 7: Full test suite verification

- [ ] **Step 1: Run all frontend tests**

```bash
cd frontend && npm test
```

Expected: all tests pass with no regressions.

- [ ] **Step 2: Build and verify visually**

```bash
cd /path/to/chore-ganizer && docker compose up --build -d
```

Open `http://localhost:3002` and verify:
- Dark slate navbar and sidebar visible
- Plus Jakarta Sans font loaded (check DevTools > Network > Fonts)
- Mobile: hamburger button visible, sidebar hidden; clicking hamburger opens drawer with overlay
- Desktop (≥1024px): sidebar always visible inline, no hamburger
- Buttons: indigo primary, outlined secondary/danger, ghost
- Inputs: softer borders, red-bg error state on invalid fields
- Modals: rounder corners, icon close button in pill

---

## Scope Check

| Brainstorm requirement | Task |
|---|---|
| Design tokens (color palette, font) | Task 1 |
| Responsive layout shell (desktop sidebar + mobile drawer) | Tasks 2 & 3 |
| Button variants (indigo primary, outlined secondary/danger, ghost) | Task 4 |
| Input (softer border, red-bg error state) | Task 5 |
| Modal (rounder, soft shadow, icon close) | Task 6 |
| Full test suite pass | Task 7 |
