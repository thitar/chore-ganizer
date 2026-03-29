# Content Area Contrast Reduction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce the harsh contrast between the dark sidebar and the main content area by shifting the content canvas, cards, and form inputs to a cooler slate palette.

**Architecture:** Update design tokens in `tailwind.config.js` first (adds `surface.input`, updates `surface.DEFAULT`, `surface.muted`, `border.DEFAULT`), then update `index.css` for the body background, then update the `Input` component to use `bg-surface-input` instead of the hardcoded `bg-white`. The token cascade handles all other components automatically.

**Tech Stack:** React 18, TypeScript, Tailwind CSS v3, Vitest

---

## File Map

| File | Change |
|---|---|
| `frontend/tailwind.config.js` | Update `surface.DEFAULT` → `#e2e8f0`, `surface.muted` → `#cbd5e1`, `border.DEFAULT` → `#b6c0cc`; add `surface.input: '#f1f5f9'` |
| `frontend/src/index.css` | Update `background-color` from `#f8fafc` to `#cbd5e1` |
| `frontend/src/components/common/Input.tsx` | Replace `bg-white` with `bg-surface-input` in the normal (non-error) class string |
| `frontend/src/components/common/Input.test.tsx` | Update the "applies normal border when no error" test to also assert `bg-surface-input` |

---

## Task 1: Update design tokens

**Files:**
- Modify: `frontend/tailwind.config.js`
- Modify: `frontend/src/index.css`

No tests for pure config/CSS — changes are verified visually via docker compose.

- [ ] **Step 1: Update tailwind.config.js**

Replace the entire file:

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
          DEFAULT: '#e2e8f0',
          muted: '#cbd5e1',
          input: '#f1f5f9',
        },
        border: {
          DEFAULT: '#b6c0cc',
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

- [ ] **Step 2: Update index.css body background**

Change only the `background-color` line in `:root`:

```css
background-color: #cbd5e1;
```

The full `:root` block after the change:

```css
:root {
  font-family: 'Plus Jakarta Sans', Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;

  color-scheme: light;
  color: #0f172a;
  background-color: #cbd5e1;

  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/tailwind.config.js frontend/src/index.css
git commit -m "feat(ui): update surface and border tokens for softer content contrast"
```

---

## Task 2: Update Input component

**Files:**
- Modify: `frontend/src/components/common/Input.tsx`
- Modify: `frontend/src/components/common/Input.test.tsx`

- [ ] **Step 1: Update the failing test first**

In `frontend/src/components/common/Input.test.tsx`, update the "applies normal border when no error" test to also assert `bg-surface-input`:

```tsx
it('applies normal border when no error', () => {
  render(<Input />)
  const input = screen.getByRole('textbox')
  expect(input).toHaveClass('border-border')
  expect(input).toHaveClass('bg-surface-input')
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /path/to/worktree/frontend && npm test -- src/components/common/Input.test.tsx --run
```

Expected: FAIL — "applies normal border when no error" fails because `bg-surface-input` class is not yet on the input.

- [ ] **Step 3: Update Input.tsx**

Replace the entire file:

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
        className={`w-full px-3 py-2.5 border rounded-md text-sm text-slate-900 bg-surface-input focus:outline-none focus:ring-2 focus:ring-primary-ring focus:border-transparent ${
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

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /path/to/worktree/frontend && npm test -- src/components/common/Input.test.tsx --run
```

Expected: all 14 tests pass.

- [ ] **Step 5: Run full test suite to catch any regressions**

```bash
cd /path/to/worktree/frontend && npm test -- --run
```

Expected: all 168 tests pass.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/common/Input.tsx frontend/src/components/common/Input.test.tsx
git commit -m "feat(ui): use bg-surface-input token on Input component"
```

---

## Scope Check

| Spec requirement | Task |
|---|---|
| `surface.muted` → `#cbd5e1` (page canvas) | Task 1 |
| `surface.DEFAULT` → `#e2e8f0` (cards/panels) | Task 1 |
| `border.DEFAULT` → `#b6c0cc` (borders) | Task 1 |
| `surface.input: '#f1f5f9'` (new token) | Task 1 |
| `index.css` body background updated | Task 1 |
| Input `bg-white` → `bg-surface-input` | Task 2 |
| Input test updated | Task 2 |
