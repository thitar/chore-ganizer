# Content Area Contrast Reduction — Design Spec

**Goal:** Reduce the visual contrast between the dark slate sidebar and the main content area by shifting the content canvas, cards, and form inputs to a cooler slate palette.

**Problem:** The current content background (`#f8fafc`) is very bright against the dark sidebar (`#1e293b`), creating a jarring contrast.

---

## Token Changes

| Token | Old value | New value | Tailwind name |
|---|---|---|---|
| `surface.muted` (canvas/page bg) | `#f8fafc` | `#cbd5e1` | slate-300 |
| `surface.DEFAULT` (cards/panels) | `#ffffff` | `#e2e8f0` | slate-200 |
| `border.DEFAULT` (card/input borders) | `#e2e8f0` | `#b6c0cc` | ~slate-350 |
| Input background | `#ffffff` (hardcoded) | `#f1f5f9` (slate-100) | via `bg-surface-input` token |

A new token `surface.input` (`#f1f5f9`) is added so inputs are slightly lighter than cards, giving them definition without reverting to white.

---

## Files Changed

| File | Change |
|---|---|
| `frontend/tailwind.config.js` | Update `surface.muted`, `surface.DEFAULT`, `border.DEFAULT`; add `surface.input` |
| `frontend/src/index.css` | Update `background-color` to `#cbd5e1` |
| `frontend/src/components/common/Input.tsx` | Change `bg-white` to `bg-surface-input` |
| `frontend/src/components/common/Input.test.tsx` | Update class assertion from `bg-white`-related to `bg-surface-input` |

No other components change — the token cascade handles everything else. Sidebar, navbar, buttons, text colors, and status badges are untouched.

---

## Token Cascade

The updated tokens propagate automatically to any component already using these Tailwind utility classes:

- `bg-surface` → cards, modal panel, form sections
- `bg-surface-muted` → page canvas (set on `body` in `index.css`)
- `border-border` → card and input borders
- `bg-surface-input` → form inputs (new, only `Input.tsx` uses it)

---

## Out of Scope

- Dark mode toggle — not requested
- Sidebar color — unchanged
- Text colors — unchanged
- Button variants — unchanged
- Status badge colors — unchanged
