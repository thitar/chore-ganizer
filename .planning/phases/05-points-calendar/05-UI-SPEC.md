---
phase: 5
slug: points-calendar
status: approved
shadcn_initialized: false
preset: not applicable
created: 2026-06-28
inherits: 03-UI-SPEC.md
---

# Phase 5 — UI Design Contract

> Visual and interaction contract for PointsPage and CalendarPage.

---

## Inheritance Notice

Inherits all design system patterns from `03-UI-SPEC.md`:
- Vanilla Tailwind CSS, lucide-react icons, Inter font
- 60/30/10 color ratio (gray-50 / white / indigo)
- 3 text sizes (24/16/14px) + caption (12px), 2 weights (400/700)
- All component patterns (cards, forms, buttons, status badges, tables, loading, error)

**Rule:** New code follows Phase 3 patterns exactly. No new components, colors, or spacing.

---

## New Pages

### PointsPage (My Points)

**Route:** `/points`
**Access:** Any authenticated user (parent or child)
**File:** `frontend-v2/src/pages/PointsPage.tsx`

**Purpose:** User's own point balance and adjustment history. Children see only their own; parents can switch to view any family member.

**Layout:**
```html
<div class="min-h-screen bg-gray-50">
  <NavBar />  <!-- "Points" link is active on this page, visible to all roles -->
  <div class="max-w-4xl mx-auto px-4 py-8">
    <h2 class="text-2xl font-bold text-gray-900 mb-4">My Points</h2>

    <!-- Balance card (prominent) -->
    <div class="bg-white rounded-lg shadow-md p-6 mb-6 text-center">
      <p class="text-sm font-normal text-gray-500 mb-1">Current Balance</p>
      <p class="text-4xl font-bold text-primary">{balance} pts</p>
    </div>

    <!-- Parent-only: User selector + Adjust form -->
    {user.role === 'PARENT' && (
      <div class="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 class="text-lg font-bold text-gray-900 mb-4">Adjust Points</h3>
        <form class="space-y-3">
          <select>...</select>
          <input type="number" placeholder="Amount (positive to add, negative to deduct)" />
          <input type="text" placeholder="Reason (required)" />
          <button>Adjust</button>
        </form>
      </div>
    )}

    <!-- Log table -->
    <div class="bg-white rounded-lg shadow-md">
      <div class="bg-gray-50 px-4 py-3 border-b text-sm font-normal text-gray-500 grid grid-cols-12 gap-4">
        <div class="col-span-2">Date</div>
        <div class="col-span-2">Type</div>
        <div class="col-span-2">Amount</div>
        <div class="col-span-6">Reason</div>
      </div>
      <div class="divide-y">
        {logs.map(log => (
          <div class="px-4 py-3 grid grid-cols-12 gap-4 items-center hover:bg-gray-50">
            <div class="col-span-2 text-sm text-gray-600">{formatDate(log.createdAt)}</div>
            <div class="col-span-2">
              <span class={typeClass(log.type)}>{log.type}</span>
            </div>
            <div class="col-span-2 font-bold text-gray-900">+{log.amount}</div>
            <div class="col-span-6 text-sm text-gray-600">{log.reason}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
</div>
```

**Type badge colors** (extend StatusBadge):
- EARNED: `bg-green-100 text-green-800`
- BONUS: `bg-blue-100 text-blue-800`
- DEDUCTION: `bg-red-100 text-red-800`
- PENALTY: `bg-red-100 text-red-800`
- REVERSED: `bg-gray-100 text-gray-600`
- ADJUSTMENT: `bg-purple-100 text-purple-800`

**Empty state:**
"No point history yet. Complete a chore to start earning points!"

**Loading state:** Centered spinner with "Loading points..."

**Error state:** Same retry pattern as other pages.

### CalendarPage

**Route:** `/calendar`
**Access:** Any authenticated user (parent sees all family, child sees all)
**File:** `frontend-v2/src/pages/CalendarPage.tsx`

**Purpose:** Monthly calendar grid showing all family assignments color-coded by user.

**Layout:**
```html
<div class="min-h-screen bg-gray-50">
  <NavBar />
  <div class="max-w-7xl mx-auto px-4 py-8">
    <div class="flex items-center justify-between mb-4">
      <button><ChevronLeft /></button>
      <h2 class="text-2xl font-bold text-gray-900">{monthYear}</h2>
      <button><ChevronRight /></button>
    </div>

    <div class="bg-white rounded-lg shadow-md overflow-hidden">
      <!-- Day headers -->
      <div class="grid grid-cols-7 bg-gray-50 border-b">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day => (
          <div class="px-2 py-3 text-center text-sm font-normal text-gray-500">{day}</div>
        ))}
      </div>

      <!-- Calendar grid (6 rows × 7 cols) -->
      <div class="grid grid-cols-7 grid-rows-6">
        {days.map(day => (
          <div class={dayClass(day)}>
            <div class="text-sm font-normal text-gray-900 mb-1">{day.date}</div>
            {day.assignments.map(a => (
              <div class={assignmentPillClass(a)} title={a.template.title}>
                {a.template.title}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  </div>
</div>
```

**Day cell states:**
- Current month: `bg-white border-r border-b`
- Other month: `bg-gray-50 text-gray-400`
- Today: `bg-primary-light`
- Has assignments: shows color-coded pills

**Assignment pill:**
```html
<div class="text-xs px-1 py-0.5 rounded mb-0.5 truncate" 
     style={`background-color: ${assignmentColor(assignment)}20; color: ${assignmentColor(assignment)}`}>
  {assignment.template.title}
</div>
```

Color: the assignedTo user's color (e.g., `#10B981` for Alice = emerald). Background is the color at 12% opacity (alpha channel `20` hex). Text is the full color.

**Legend (below calendar):**
```html
<div class="mt-4 flex flex-wrap gap-3 text-sm">
  {users.map(u => (
    <div class="flex items-center gap-1">
      <span class="w-3 h-3 rounded-full" style={{ backgroundColor: u.color }} />
      <span class="text-gray-600">{u.name}</span>
    </div>
  ))}
</div>
```

**Loading state:** Centered spinner with "Loading calendar..."

**Error state:** Same retry pattern.

**Empty month:** "No chores scheduled for {month}." inside the grid.

---

## Navigation Bar Update

Add two links (visible to ALL roles):
- "Points" — between "My Chores" and (parent-only section) "Templates"
- "Calendar" — after "Assignments" (last in parent nav)

For child nav, "Points" and "Calendar" appear after "My Chores".

---

## API Layer

### points.api.ts

```typescript
interface PointLog {
  id: number
  userId: number
  amount: number
  reason: string
  type: 'EARNED' | 'BONUS' | 'DEDUCTION' | 'PENALTY' | 'REVERSED' | 'ADJUSTMENT' | 'PAYOUT' | 'ADVANCE'
  createdAt: string
  user: { id: number; name: string; color: string }
}

interface PointsSummary {
  user: { id: number; name: string; color: string }
  balance: number
  logs: PointLog[]
}

// Map points/api endpoints
getMyPoints(): Promise<PointsSummary>
getUserPoints(userId): Promise<PointsSummary>  // parent only
adjustPoints(userId, amount, reason): Promise<PointLog>  // parent only
```

### calendar.api.ts

```typescript
interface CalendarAssignment {
  id: number
  type: 'REGULAR' | 'RECURRING'
  templateId: number
  templateTitle: string
  templatePoints: number
  assignedToId: number
  assignedToName: string
  assignedToColor: string
  dueDate: string  // YYYY-MM-DD
  status: 'PENDING' | 'COMPLETED'
}

getCalendar(from: string, to: string): Promise<CalendarAssignment[]>
```

---

## Copy Patterns

| Element | Copy |
|---------|------|
| Page title (Points) | "My Points" |
| Balance card label | "Current Balance" |
| Empty state | "No point history yet. Complete a chore to start earning points!" |
| Adjust form header | "Adjust Points" |
| Adjust button | "Adjust" |
| Adjust placeholder | "Amount (positive to add, negative to deduct)" |
| Reason placeholder | "Reason (required)" |
| Page title (Calendar) | "{Month Year}" (dynamic) |
| Empty month | "No chores scheduled for {month}." |
| Loading (Points) | "Loading points..." |
| Loading (Calendar) | "Loading calendar..." |
| Error retry | "Try again" |

---

## States Summary

| State | Visual |
|-------|--------|
| Loading | Spinner + descriptive text |
| Error | `bg-red-50` panel with retry button |
| Empty | Centered text in card body |
| Submitting | Button disabled with "..." indicator |
| Success (Adjust) | Toast appears with new balance, log updates |

---

## Anti-Patterns (Don't Do)

- ❌ Don't show the "Adjust Points" form to children — even read-only
- ❌ Don't display different point types with the same color (color-code by type)
- ❌ Don't show the entire PointLog history if it has 1000+ entries — paginate after 100 (out of scope, use "load more" if needed)
- ❌ Don't use a heavy date picker for the calendar — month navigation is enough
- ❌ Don't show external/3rd-party calendar integration in Phase 5 — defer
- ❌ Don't display UTC timestamps in the UI — convert to local date strings
- ❌ Don't show negative balance warnings in Phase 5 (overspend is allowed, parents can correct)
- ❌ Don't use a different font for the calendar — Inter only
