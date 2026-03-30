# Calendar Redesign — Avatar Grid + Day Detail Panel

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the CalendarView month grid with a compact avatar-based layout where each day cell shows member avatar circles, and clicking a day reveals a full chore detail panel below the grid.

**Architecture:** All changes are confined to `frontend/src/components/chores/CalendarView.tsx`. The data fetching, props interface, and week view are untouched. Two sub-components (`DayDetailPanel` and helper functions) are added at the top of the same file.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Vitest + React Testing Library

---

## File Map

| File | Action | What changes |
|---|---|---|
| `frontend/src/components/chores/CalendarView.tsx` | Modify | Dynamic row count, avatar cell render, selectedDay state, DayDetailPanel component |
| `frontend/src/components/chores/CalendarView.test.tsx` | Create | Tests for row count, avatar rendering, day detail panel |

---

## Task 1: Fix dynamic row count in `generateCalendarDays`

**Files:**
- Modify: `frontend/src/components/chores/CalendarView.tsx` (inside `generateCalendarDays`, around line 259)
- Create: `frontend/src/components/chores/CalendarView.test.tsx`

The current code always pads to 42 cells (`6 rows × 7`). This task fixes it to only generate the rows the month actually needs.

- [ ] **Step 1: Create the test file**

```typescript
// frontend/src/components/chores/CalendarView.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '../../test/utils'
import CalendarView from './CalendarView'

vi.mock('../../api/assignments.api', () => ({
  assignmentsApi: {
    getCalendar: vi.fn().mockResolvedValue({ assignments: [], year: 2026, month: 2, days: {} }),
  },
}))

vi.mock('../../api/recurring-chores.api', () => ({
  recurringChoresApi: {
    listOccurrences: vi.fn().mockResolvedValue([]),
  },
}))

describe('CalendarView — month grid row count', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders 4 rows for February 2026 (starts Sunday, 28 days)', async () => {
    // Feb 1 2026 is a Sunday: firstDay=0, daysInMonth=28 → ceil((0+28)/7)=4 rows → 28 day cells
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-15T12:00:00'))

    render(<CalendarView />)
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument())

    // 28 current-month cells + 0 overflow cells = 28 total day cells
    // Day "1" through "28" should all be visible; "29" should NOT be a current-month cell
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('28')).toBeInTheDocument()
    // No 6th row: day 29–35 of a 6-row grid would be next-month overflow
    // We check the grid has exactly 28 + 0 overflow = 28 data cells (4 weeks × 7)
    const dayCells = document.querySelectorAll('[data-testid="cal-cell"]')
    expect(dayCells).toHaveLength(28)
  })

  it('renders 5 rows for March 2026 (starts Sunday, 31 days)', async () => {
    // Mar 1 2026 is a Sunday: firstDay=0, daysInMonth=31 → ceil((0+31)/7)=5 rows → 35 cells
    // 31 current-month + 4 next-month overflow = 35
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-15T12:00:00'))

    render(<CalendarView />)
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument())

    const dayCells = document.querySelectorAll('[data-testid="cal-cell"]')
    expect(dayCells).toHaveLength(35)
  })

  it('renders 6 rows for May 2026 (starts Friday, 31 days)', async () => {
    // May 1 2026 is a Friday: firstDay=5, daysInMonth=31 → ceil((5+31)/7)=ceil(5.14)=6 rows → 42 cells
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-15T12:00:00'))

    render(<CalendarView />)
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument())

    const dayCells = document.querySelectorAll('[data-testid="cal-cell"]')
    expect(dayCells).toHaveLength(42)
  })
})
```

- [ ] **Step 2: Run to confirm it fails**

```bash
cd frontend && npm test -- CalendarView.test.tsx
```

Expected: FAIL — `cal-cell` test-id not found yet.

- [ ] **Step 3: Update `generateCalendarDays` for dynamic rows**

In `CalendarView.tsx`, find the comment `// Next month days to fill the grid (6 rows x 7 days = 42)` (around line 259) and replace the block:

```typescript
// Before:
// Next month days to fill the grid (6 rows x 7 days = 42)
const remainingDays = 42 - days.length

// After:
const weeksNeeded = Math.ceil((firstDay + daysInMonth) / 7)
const totalCells = weeksNeeded * 7
const remainingDays = totalCells - days.length
```

- [ ] **Step 4: Add `data-testid="cal-cell"` to each month-view day cell**

In the month view render block (the `<>` wrapper that was recently changed to `<div className="grid grid-cols-7 gap-1">`), add `data-testid="cal-cell"` to the outer `<div>` for each cell:

```tsx
<div
  key={index}
  data-testid="cal-cell"
  onClick={() => handleDateClick(calendarDay)}
  className={`
    min-h-[80px] p-1 border rounded-lg
    ...
  `}
>
```

- [ ] **Step 5: Run tests — should pass**

```bash
cd frontend && npm test -- CalendarView.test.tsx
```

Expected: 3 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/chores/CalendarView.tsx frontend/src/components/chores/CalendarView.test.tsx
git commit -m "feat(calendar): dynamic month row count (4-6 rows)"
```

---

## Task 2: Replace event chips with avatar cells

**Files:**
- Modify: `frontend/src/components/chores/CalendarView.tsx`
- Modify: `frontend/src/components/chores/CalendarView.test.tsx`

Replace the existing event-chip rendering in month cells with avatar circles (one per unique member with chores that day).

- [ ] **Step 1: Add tests for avatar rendering**

Append to the `describe` block in `CalendarView.test.tsx`:

```typescript
import { assignmentsApi } from '../../api/assignments.api'
import type { Mock } from 'vitest'

describe('CalendarView — avatar indicators', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-15T12:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows one avatar per unique member with chores on a day', async () => {
    ;(assignmentsApi.getCalendar as Mock).mockResolvedValue({
      assignments: [
        {
          id: 1,
          choreTemplate: { id: 1, title: 'Dishes', points: 10 },
          assignedTo: { id: 2, name: 'Alice', color: '#3b82f6' },
          dueDate: '2026-03-07T12:00:00.000Z',
          status: 'PENDING',
          isOverdue: false,
        },
        {
          id: 2,
          choreTemplate: { id: 2, title: 'Trash', points: 5 },
          assignedTo: { id: 3, name: 'Bob', color: '#f97316' },
          dueDate: '2026-03-07T12:00:00.000Z',
          status: 'PENDING',
          isOverdue: false,
        },
      ],
      year: 2026, month: 3, days: {},
    })

    render(<CalendarView />)
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument())

    // Both member initials should appear in the grid
    expect(screen.getByTitle('Alice')).toBeInTheDocument()
    expect(screen.getByTitle('Bob')).toBeInTheDocument()
  })

  it('shows overdue outline on avatar when member has an overdue chore', async () => {
    ;(assignmentsApi.getCalendar as Mock).mockResolvedValue({
      assignments: [
        {
          id: 1,
          choreTemplate: { id: 1, title: 'Dishes', points: 10 },
          assignedTo: { id: 2, name: 'Alice', color: '#3b82f6' },
          dueDate: '2026-03-05T12:00:00.000Z',
          status: 'PENDING',
          isOverdue: true,
        },
      ],
      year: 2026, month: 3, days: {},
    })

    render(<CalendarView />)
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument())

    const avatar = screen.getByTitle('Alice — overdue')
    expect(avatar).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to confirm tests fail**

```bash
cd frontend && npm test -- CalendarView.test.tsx
```

Expected: FAIL — avatar `title` attributes not present yet.

- [ ] **Step 3: Add `getMembersForDay` helper function**

Add this function near the top of `CalendarView.tsx`, just above the `export default function CalendarView` line:

```typescript
interface DayMember {
  id: number
  name: string
  color: string | null
  initial: string
  isOverdue: boolean
}

function getMembersForDay(events: CalendarEvent[]): DayMember[] {
  const memberMap = new Map<number, DayMember>()
  events.forEach(event => {
    const existing = memberMap.get(event.assignedTo.id)
    memberMap.set(event.assignedTo.id, {
      id: event.assignedTo.id,
      name: event.assignedTo.name,
      color: event.assignedTo.color,
      initial: event.assignedTo.name.charAt(0).toUpperCase(),
      isOverdue: (existing?.isOverdue ?? false) || event.isOverdue,
    })
  })
  return Array.from(memberMap.values())
}
```

- [ ] **Step 4: Replace month-view cell content with avatar layout**

Find the month view render block (inside the `<div className="grid grid-cols-7 gap-1">` wrapper). Replace the entire `{calendarDays.map(...)}` content with the following. Note: keep `data-testid="cal-cell"` from Task 1.

```tsx
{calendarDays.map((calendarDay, index) => {
  const members = getMembersForDay(calendarDay.events)
  const hasOverdue = calendarDay.events.some(e => e.isOverdue)

  return (
    <div
      key={index}
      data-testid="cal-cell"
      onClick={() => calendarDay.isCurrentMonth && handleDateClick(calendarDay)}
      className={[
        'h-14 flex flex-col items-center pt-1 pb-1 rounded-lg border box-border',
        !calendarDay.isCurrentMonth
          ? 'bg-gray-50 border-transparent opacity-45 cursor-default'
          : 'bg-white border-gray-200 cursor-pointer hover:bg-gray-50',
        calendarDay.isToday ? 'border-2 border-blue-500 bg-blue-50' : '',
      ].join(' ')}
    >
      <span className={[
        'text-xs font-semibold leading-none mb-1',
        !calendarDay.isCurrentMonth ? 'text-gray-400' :
        calendarDay.isToday ? 'text-blue-600' :
        hasOverdue ? 'text-red-600' : 'text-gray-700',
      ].join(' ')}>
        {calendarDay.day}
      </span>
      <div className="flex flex-wrap justify-center gap-0.5 px-0.5">
        {members.map((member) => (
          <span
            key={member.id}
            title={member.isOverdue ? `${member.name} — overdue` : member.name}
            className="w-3.5 h-3.5 rounded-full inline-flex items-center justify-center text-white font-bold flex-shrink-0"
            style={{
              backgroundColor: member.color || '#3B82F6',
              fontSize: '7px',
              outline: member.isOverdue ? '2px solid #EF4444' : 'none',
              outlineOffset: '1px',
            }}
          >
            {member.initial}
          </span>
        ))}
      </div>
    </div>
  )
})}
```

- [ ] **Step 5: Remove the old `handleDateClick` guard that blocked days with events**

Find the existing `handleDateClick` function:

```typescript
// Old — only fires when no events on the day
const handleDateClick = (calendarDay: CalendarDay) => {
  if (calendarDay.isCurrentMonth && calendarDay.events.length === 0 && onDateClick) {
    onDateClick(calendarDay.date)
  }
}
```

Replace it with a version that always sets `selectedDay` (the detail panel will handle `onDateClick`). This is a temporary stub — Task 3 will add `selectedDay` state and replace this fully:

```typescript
const handleDateClick = (calendarDay: CalendarDay) => {
  // Will be wired to selectedDay in Task 3
  if (calendarDay.isCurrentMonth && calendarDay.events.length === 0 && onDateClick) {
    onDateClick(calendarDay.date)
  }
}
```

Leave this unchanged for now — Task 3 replaces it.

- [ ] **Step 6: Update the legend to show member colors + overdue marker**

Find the existing legend block (after the grid, inside the `return`):

```tsx
{/* Legend */}
<div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
  ...
</div>
```

Replace it with a dynamic member legend:

```tsx
{/* Legend */}
{(() => {
  const legendMembers: { id: number; name: string; color: string | null }[] = []
  const seen = new Set<number>()
  events.forEach(e => {
    if (!seen.has(e.assignedTo.id)) {
      seen.add(e.assignedTo.id)
      legendMembers.push({ id: e.assignedTo.id, name: e.assignedTo.name, color: e.assignedTo.color })
    }
  })
  return legendMembers.length > 0 ? (
    <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center gap-3 text-xs text-gray-600">
      {legendMembers.map(m => (
        <div key={m.id} className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: m.color || '#3B82F6' }}
          />
          {m.name}
        </div>
      ))}
      <div className="flex items-center gap-1.5">
        <span className="w-3 h-3 rounded-full flex-shrink-0 bg-white border-2 border-red-500" />
        <span className="text-red-600">Overdue</span>
      </div>
    </div>
  ) : null
})()}
```

- [ ] **Step 7: Run all tests**

```bash
cd frontend && npm test -- CalendarView.test.tsx
```

Expected: All tests PASS.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/chores/CalendarView.tsx frontend/src/components/chores/CalendarView.test.tsx
git commit -m "feat(calendar): avatar indicators replace event chips in month view"
```

---

## Task 3: Add `selectedDay` state and `DayDetailPanel` component

**Files:**
- Modify: `frontend/src/components/chores/CalendarView.tsx`
- Modify: `frontend/src/components/chores/CalendarView.test.tsx`

Clicking a day cell sets `selectedDay` state. A `DayDetailPanel` sub-component renders below the grid showing all chores for that day with status badges and a "+ Add chore" button for parents.

- [ ] **Step 1: Add tests for the day detail panel**

Append to `CalendarView.test.tsx`:

```typescript
describe('CalendarView — day detail panel', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-15T12:00:00'))
    ;(assignmentsApi.getCalendar as Mock).mockResolvedValue({
      assignments: [
        {
          id: 1,
          choreTemplate: { id: 1, title: 'Dishes', points: 15 },
          assignedTo: { id: 2, name: 'Alice', color: '#3b82f6' },
          dueDate: '2026-03-15T12:00:00.000Z',
          status: 'PENDING',
          isOverdue: false,
        },
      ],
      year: 2026, month: 3, days: {},
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows detail panel when a day with chores is clicked', async () => {
    const mockEventClick = vi.fn()
    render(<CalendarView onEventClick={mockEventClick} />)
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument())

    // Click on day 15 cell
    const cells = document.querySelectorAll('[data-testid="cal-cell"]')
    // Mar 15 2026: firstDay=0 (Sun), so cell index = 14 (0-indexed)
    fireEvent.click(cells[14])

    expect(screen.getByText('Sunday, March 15')).toBeInTheDocument()
    expect(screen.getByText('Dishes')).toBeInTheDocument()
    expect(screen.getByText('Alice · 15 pts · One-off')).toBeInTheDocument()
  })

  it('closes the panel when ✕ is clicked', async () => {
    render(<CalendarView />)
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument())

    const cells = document.querySelectorAll('[data-testid="cal-cell"]')
    fireEvent.click(cells[14])
    expect(screen.getByText('Dishes')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '✕' }))
    expect(screen.queryByText('Dishes')).not.toBeInTheDocument()
  })

  it('calls onEventClick when a chore row in the panel is clicked', async () => {
    const mockEventClick = vi.fn()
    render(<CalendarView onEventClick={mockEventClick} />)
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument())

    const cells = document.querySelectorAll('[data-testid="cal-cell"]')
    fireEvent.click(cells[14])
    fireEvent.click(screen.getByText('Dishes'))

    expect(mockEventClick).toHaveBeenCalledWith(expect.objectContaining({ title: 'Dishes' }))
  })

  it('shows "+ Add chore" button when onDateClick prop is provided', async () => {
    const mockDateClick = vi.fn()
    render(<CalendarView onDateClick={mockDateClick} />)
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument())

    const cells = document.querySelectorAll('[data-testid="cal-cell"]')
    fireEvent.click(cells[14])

    expect(screen.getByText('+ Add chore on this day')).toBeInTheDocument()
  })

  it('does NOT show "+ Add chore" button when onDateClick is not provided', async () => {
    render(<CalendarView />)
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument())

    const cells = document.querySelectorAll('[data-testid="cal-cell"]')
    fireEvent.click(cells[14])

    expect(screen.queryByText('+ Add chore on this day')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to confirm tests fail**

```bash
cd frontend && npm test -- CalendarView.test.tsx
```

Expected: FAIL — panel elements not present yet.

- [ ] **Step 3: Add `statusBadgeClass` and `statusLabel` helpers**

Add these two functions near the top of `CalendarView.tsx`, just below the `getMembersForDay` function from Task 2:

```typescript
function statusBadgeClass(status: string, isOverdue: boolean): string {
  if (isOverdue) return 'bg-red-100 text-red-700'
  switch (status) {
    case 'COMPLETED': return 'bg-green-100 text-green-700'
    case 'PARTIALLY_COMPLETE': return 'bg-orange-100 text-orange-700'
    case 'SKIPPED': return 'bg-gray-100 text-gray-600'
    default: return 'bg-yellow-100 text-yellow-700'
  }
}

function statusLabel(status: string, isOverdue: boolean): string {
  if (isOverdue) return 'Overdue'
  switch (status) {
    case 'COMPLETED': return 'Done ✓'
    case 'PARTIALLY_COMPLETE': return 'Partial'
    case 'SKIPPED': return 'Skipped'
    default: return 'Pending'
  }
}
```

- [ ] **Step 4: Add the `DayDetailPanel` sub-component**

Add this function just before the `export default function CalendarView` line:

```typescript
interface DayDetailPanelProps {
  date: Date
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
  onDateClick?: (date: Date) => void
  onClose: () => void
}

function DayDetailPanel({ date, events, onEventClick, onDateClick, onClose }: DayDetailPanelProps) {
  const isToday = date.toDateString() === new Date().toDateString()
  const dateLabel = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="mt-3 border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <div>
          <div className="font-semibold text-gray-900 text-sm">
            {dateLabel}
            {isToday && <span className="ml-1 text-blue-600">— Today</span>}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            {events.length === 0
              ? 'No chores'
              : `${events.length} chore${events.length === 1 ? '' : 's'} assigned`}
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="✕"
          className="text-gray-400 hover:text-gray-600 px-2 py-1 text-sm rounded hover:bg-gray-200"
        >
          ✕
        </button>
      </div>

      {/* Chore list */}
      {events.length > 0 && (
        <div className="p-2 flex flex-col gap-1.5">
          {events.map(event => (
            <button
              key={`${event.type}-${event.id}`}
              onClick={() => onEventClick(event)}
              className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 text-left w-full"
            >
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                style={{ backgroundColor: event.assignedTo.color || '#3B82F6' }}
              >
                {event.assignedTo.name.charAt(0).toUpperCase()}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 text-sm truncate">
                  {event.title}
                  {event.type === 'occurrence' && (
                    <span className="ml-1 text-gray-400 font-normal text-xs">↻</span>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  {event.assignedTo.name} · {event.points} pts ·{' '}
                  {event.type === 'occurrence' ? 'Recurring' : 'One-off'}
                </div>
              </div>
              <span className={`rounded px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${statusBadgeClass(event.status, event.isOverdue)}`}>
                {statusLabel(event.status, event.isOverdue)}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Add chore — parents only */}
      {onDateClick && (
        <div className="px-3 pb-3">
          <button
            onClick={() => onDateClick(date)}
            className="w-full border border-dashed border-gray-300 rounded-lg py-2 text-xs text-gray-400 hover:border-indigo-400 hover:text-indigo-500 hover:bg-indigo-50 transition-colors"
          >
            + Add chore on this day
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Add `selectedDay` state to `CalendarView`**

Inside the `CalendarView` function, add state after the existing `useState` declarations:

```typescript
const [selectedDay, setSelectedDay] = useState<Date | null>(null)
```

- [ ] **Step 6: Update `handleDateClick` to set `selectedDay`**

Replace the existing `handleDateClick` function:

```typescript
const handleDateClick = (calendarDay: CalendarDay) => {
  if (!calendarDay.isCurrentMonth) return
  setSelectedDay(prev =>
    prev && prev.toDateString() === calendarDay.date.toDateString() ? prev : calendarDay.date
  )
}
```

- [ ] **Step 7: Get events for the selected day**

Add this derived value just before the `return (` in `CalendarView`:

```typescript
const selectedDayEvents = selectedDay
  ? events.filter(event => {
      const d = new Date(event.dueDate)
      return (
        d.getFullYear() === selectedDay.getFullYear() &&
        d.getMonth() === selectedDay.getMonth() &&
        d.getDate() === selectedDay.getDate()
      )
    })
  : []
```

- [ ] **Step 8: Render `DayDetailPanel` after the grid**

In the month view section, after the closing `</div>` of the `grid grid-cols-7 gap-1` div (but still inside the `else` branch), add:

```tsx
{selectedDay && (
  <DayDetailPanel
    date={selectedDay}
    events={selectedDayEvents}
    onEventClick={handleEventClick}
    onDateClick={onDateClick}
    onClose={() => setSelectedDay(null)}
  />
)}
```

- [ ] **Step 9: Apply selected-day highlight to the cell**

In the cell render from Task 2, add the selected state. Update the cell's `className` logic:

```tsx
const isSelected = selectedDay !== null &&
  calendarDay.date.toDateString() === selectedDay.toDateString()

className={[
  'h-14 flex flex-col items-center pt-1 pb-1 rounded-lg border box-border',
  !calendarDay.isCurrentMonth
    ? 'bg-gray-50 border-transparent opacity-45 cursor-default'
    : 'bg-white border-gray-200 cursor-pointer hover:bg-gray-50',
  calendarDay.isToday && !isSelected ? 'border-2 border-blue-500 bg-blue-50' : '',
  isSelected ? 'border-2 border-indigo-500 bg-indigo-50' : '',
].join(' ')}
```

And update the day-number color:

```tsx
<span className={[
  'text-xs font-semibold leading-none mb-1',
  !calendarDay.isCurrentMonth ? 'text-gray-400' :
  isSelected ? 'text-indigo-600' :
  calendarDay.isToday ? 'text-blue-600' :
  hasOverdue ? 'text-red-600' : 'text-gray-700',
].join(' ')}>
  {calendarDay.day}
</span>
```

- [ ] **Step 10: Reset `selectedDay` when navigating months**

In `goToPrevMonth` and `goToNextMonth`, add `setSelectedDay(null)`:

```typescript
const goToPrevMonth = () => {
  setSelectedDay(null)
  if (month === 1) { setMonth(12); setYear(year - 1) }
  else { setMonth(month - 1) }
}

const goToNextMonth = () => {
  setSelectedDay(null)
  if (month === 12) { setMonth(1); setYear(year + 1) }
  else { setMonth(month + 1) }
}
```

- [ ] **Step 11: Run all tests**

```bash
cd frontend && npm test -- CalendarView.test.tsx
```

Expected: All tests PASS.

- [ ] **Step 12: Commit**

```bash
git add frontend/src/components/chores/CalendarView.tsx frontend/src/components/chores/CalendarView.test.tsx
git commit -m "feat(calendar): day detail panel with chore list on cell click"
```

---

## Task 4: Remove old 6-week padding and rebuild docker

**Files:**
- Modify: `frontend/src/components/chores/CalendarView.tsx` (verify clean-up)

Final clean-up: verify there are no stale references to the old 42-cell grid or chip-style rendering, then rebuild the app.

- [ ] **Step 1: Check for stale references**

```bash
grep -n "42\|min-h-\[80px\]\|border-l-8\|slice(0, 2)" frontend/src/components/chores/CalendarView.tsx
```

Expected: no matches. If any are found, remove them.

- [ ] **Step 2: Run the full frontend test suite**

```bash
cd frontend && npm test
```

Expected: all tests PASS.

- [ ] **Step 3: Build the frontend container**

```bash
docker compose up --build -d frontend
```

- [ ] **Step 4: Smoke test in browser**

Open the app and verify:
- February 2026 (navigate to it) shows 4 rows
- March 2026 shows 5 rows
- Member avatar circles appear on days with chores
- Overdue avatars have a red outline ring
- Clicking a day opens the detail panel below the grid
- The panel shows chore title, member name, points, type, and status badge
- Clicking a chore row in the panel opens the existing action modal
- Clicking ✕ closes the panel
- Navigating to another month closes the panel
- Parents see the "+ Add chore on this day" button; children do not
- Week view is unaffected

- [ ] **Step 5: Final commit**

```bash
git add frontend/src/components/chores/CalendarView.tsx
git commit -m "chore(calendar): remove stale 42-cell grid references"
```
