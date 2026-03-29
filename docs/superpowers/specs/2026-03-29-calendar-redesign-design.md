# Calendar Redesign — Avatar Grid + Day Detail Panel

**Date:** 2026-03-29
**Status:** Approved

## Problem

The existing `CalendarView` month grid always renders 42 cells (6 rows × 7 columns) regardless of whether the month needs that many rows. Most months only need 4–5 rows. Additionally, the event display (colored chips) is visually noisy and doesn't immediately communicate *who* has chores on a given day.

## Solution

Replace the month view grid with a compact avatar-based heat map. Each day cell shows the day number and a row of small colored avatar circles — one per family member who has at least one chore that day. Clicking a day opens a detail panel below the grid listing all chores for that day.

---

## Grid Layout

- Single unified CSS grid: `grid-template-columns: repeat(7, 1fr)` containing all cells (day-name headers + day cells) in one grid element — not separate per-row grids.
- **Dynamic rows:** Calculate the actual number of weeks needed (`Math.ceil((firstDayOffset + daysInMonth) / 7)`) and only render that many rows (4, 5, or 6). No padding to 42.
- Each cell is a fixed height (e.g. `52px`) so all cells are identical size regardless of how many avatars they contain.
- Previous/next month overflow cells are shown dimmed (`opacity: 0.45`, no border) to fill the first and last partial weeks. They are not clickable.

### Cell States

| State | Style |
|---|---|
| Default | White background, `border: 1px solid #e2e8f0` |
| Today | Blue border (`#3b82f6`), light blue background (`#eff6ff`) |
| Selected | Indigo border (`#6366f1`), light indigo background (`#eef2ff`) |
| Other month | Grey background, no border, 45% opacity, not clickable |
| Hover | Slightly darker background |

### Avatar Indicators

- Each family member with ≥1 chore on that day gets one avatar circle (14×14px, their `user.color`, their initial).
- Avatars are arranged in a small row below the day number, centered, wrapping if needed.
- If any of that member's chores on that day are overdue, their avatar gets a red outline ring (`outline: 2px solid #ef4444`).
- The day number itself turns red if any chore on that day is overdue.
- A persistent legend below the grid shows each family member's color dot and name.

---

## Day Detail Panel

Rendered below the grid inside the same card. Appears when a current-month day is clicked; hidden when ✕ is clicked or another day is clicked while the panel is open.

### Panel Header

- Date formatted as `"Weekday, Month Day"` (e.g. "Monday, March 7")
- `"Today"` appended if applicable
- Subtitle: `"N chores assigned"` (or `"No chores"` if empty)
- ✕ close button (top-right)

### Chore Rows

Each chore for the selected day is a row containing:
- Large avatar circle (28×28px) with member color and initial
- **Chore name** (bold) + meta line: `"Member name · N pts · One-off"` or `"Member name · N pts · Recurring ↻"`
- Status badge (right-aligned):
  - Pending → amber
  - Done → green with ✓
  - Overdue → red
  - Partial → orange

Clicking a chore row opens the existing chore action modal (complete / partial / skip), same as the current `onEventClick` handler.

### Add Chore Button

For parent users only: a dashed "+ Add chore on this day" button at the bottom of the panel. Clicking it triggers the existing `onDateClick(date)` handler, which opens the new-chore modal.

---

## Architecture

### Component changes

**`CalendarView.tsx`** — modify the existing component:
- Replace the month-view render section with the new single-grid approach.
- Add `selectedDay: Date | null` state; clicking a cell sets it.
- Extract the day detail into a `DayDetailPanel` sub-component in the same file (not a separate file — it's tightly coupled to CalendarView's state and event handlers).
- Keep the week view unchanged.
- Keep all existing data fetching, event mapping, and `onEventClick`/`onDateClick` props unchanged — this is a pure render change.

### Dynamic row calculation

```ts
const weeksNeeded = Math.ceil((firstDay + daysInMonth) / 7)
const totalCells = weeksNeeded * 7
// Fill remaining cells with next-month days as before
```

### No backend changes required.

---

## What is NOT changing

- Week view — untouched
- Data fetching logic
- The assignment/occurrence action modals
- The family member filter dropdown
- The "Today" / prev/next navigation buttons

---

## Testing

- Verify months with 4-week, 5-week, and 6-week spans all render correctly (e.g. Feb 2026 = 4 weeks, Mar 2026 = 5 weeks).
- Verify the day detail panel opens/closes correctly.
- Verify the overdue red-ring avatar shows correctly.
- Verify parents see the "Add chore" button; children do not.
- Verify clicking a chore row in the panel still triggers the action modal.
- Verify the week view is unaffected.
