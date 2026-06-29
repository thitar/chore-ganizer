---
phase: 6
slug: user-management-profile
status: approved
shadcn_initialized: false
preset: not applicable
created: 2026-06-28
inherits: 03-UI-SPEC.md
---

# Phase 6 — UI Design Contract

> Visual and interaction contract for UsersPage and ProfilePage.

---

## Inheritance Notice

Inherits all design system patterns from `03-UI-SPEC.md`:
- Vanilla Tailwind, lucide-react icons, Inter font
- 60/30/10 color ratio
- 3 text sizes (24/16/14px) + caption, 2 weights (400/700)
- Component patterns (cards, forms, buttons, status badges, tables, loading, error)

---

## New Pages

### UsersPage (Family Members)

**Route:** `/users`
**Access:** PARENT only
**File:** `frontend-v2/src/pages/UsersPage.tsx`

**Layout:**
```html
<div class="min-h-screen bg-gray-50">
  <NavBar />  <!-- "Users" link is active -->
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <h2 class="text-2xl font-bold text-gray-900 mb-4">Family Members</h2>
    <p class="text-gray-600 mb-6">Manage your family member accounts.</p>

    <!-- Create button -->
    <button>+ Create User</button>

    <!-- Create form (toggle) -->
    <form>...</form>

    <!-- Users list -->
    <div class="bg-white rounded-lg shadow-md">
      <div class="grid grid-cols-12 px-4 py-3 border-b bg-gray-50 text-sm font-normal text-gray-500">
        <div class="col-span-3">Name</div>
        <div class="col-span-4">Email</div>
        <div class="col-span-2">Role</div>
        <div class="col-span-1">Color</div>
        <div class="col-span-2 text-right">Actions</div>
      </div>
      <div class="divide-y">
        {users.map(u => (
          <div class="px-4 py-3 grid grid-cols-12 gap-4 items-center hover:bg-gray-50">
            <div class="col-span-3">
              <div class="font-bold text-gray-900">{u.name}</div>
            </div>
            <div class="col-span-4 text-sm text-gray-600">{u.email}</div>
            <div class="col-span-2">
              <span class={roleBadgeClass(u.role)}>{u.role}</span>
            </div>
            <div class="col-span-1">
              <span class="w-6 h-6 rounded-full inline-block" style={{ backgroundColor: u.color }} />
            </div>
            <div class="col-span-2 text-right">
              {u.id !== currentUserId ? (
                <button onClick={() => setDeletingId(u.id)}>
                  <Trash2 />
                </button>
              ) : (
                <span class="text-gray-400 text-xs">You</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  </main>
</div>
```

**Create form fields:**
- Name (text input, required, 1-50 chars)
- Email (text input, required, valid email format)
- Password (text input, required, min 6 chars)
- Role (select: PARENT or CHILD)
- Color (input type="color", default #4F46E5 for PARENT, #3B82F6 for CHILD)

**Role badge colors:**
- PARENT: `bg-purple-100 text-purple-800`
- CHILD: `bg-blue-100 text-blue-800`

**Self-delete protection:** Current user sees "You" text instead of delete button.

**Delete confirmation:** Use existing ConfirmDelete component. Copy: "Delete this family member? They will lose access immediately. This cannot be undone."

**Empty state:** "No family members yet" with "Create User" CTA.

**Loading/Error states:** Same as other pages.

### ProfilePage (Self-service)

**Route:** `/profile`
**Access:** Any authenticated user
**File:** `frontend-v2/src/pages/ProfilePage.tsx`

**Layout:**
```html
<div class="min-h-screen bg-gray-50">
  <NavBar />
  <main class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <h2>My Profile</h2>

    <!-- User info card -->
    <div class="bg-white rounded-lg shadow-md p-6 mb-6">
      <div class="flex items-center gap-4">
        <span class="w-12 h-12 rounded-full" style={{ backgroundColor: user.color }} />
        <div>
          <div class="text-lg font-bold">{user.name}</div>
          <div class="text-sm text-gray-600">{user.email}</div>
          <div class="text-xs text-gray-500">Role: {user.role}</div>
        </div>
      </div>
    </div>

    <!-- Password change card -->
    <div class="bg-white rounded-lg shadow-md p-6 mb-6">
      <h3>Change Password</h3>
      <form>
        <input type="password" placeholder="Current password" />
        <input type="password" placeholder="New password" />
        <input type="password" placeholder="Confirm new password" />
        <button>Update Password</button>
      </form>
    </div>

    <!-- Color change card -->
    <div class="bg-white rounded-lg shadow-md p-6">
      <h3>Display Color</h3>
      <p>Choose a color to identify yourself across the app.</p>
      <input type="color" value={user.color} />
      <button>Update Color</button>
    </div>
  </main>
</div>
```

**Password change validation:**
- Current password must match (server-side check)
- New password min 6 chars
- Confirm must match new

**Color change:** Updates immediately on submit.

**Success messages:** Toast for "Password updated" / "Color updated".

---

## Navigation Bar Update

**File:** `frontend-v2/src/components/NavBar.tsx`

- **"Profile"** — all roles, between "My Chores" and "Points"
- **"Users"** — PARENT only, after "Assignments"

---

## API Layer

### users.api.ts (extend existing)

```typescript
interface UserSummary {
  id: number
  name: string
  email: string
  role: 'PARENT' | 'CHILD'
  color: string
}

createUser(data: { name, email, password, role, color }): Promise<UserSummary>
deleteUser(id: number): Promise<{ deleted: true }>
updatePassword(currentPassword: string, newPassword: string): Promise<{ updated: true }>
updateColor(color: string): Promise<UserSummary>
```

---

## Copy Patterns

| Element | Copy |
|---------|------|
| Page title (Users) | "Family Members" |
| Page description | "Manage your family member accounts." |
| Create button | "+ Create User" |
| Form title | "New Family Member" |
| Empty state | "No family members yet. Create one to get started." |
| Self-row indicator | "You" |
| Delete confirmation | "Delete this family member? They will lose access immediately. This cannot be undone." |
| Page title (Profile) | "My Profile" |
| Password card title | "Change Password" |
| Color card title | "Display Color" |
| Color card description | "Choose a color to identify yourself across the app." |
| Password success | "Password updated!" |
| Color success | "Color updated!" |

---

## States Summary

| State | Visual |
|-------|--------|
| Loading | Spinner + descriptive text |
| Error | `bg-red-50` panel with retry |
| Empty (Users) | "No family members yet. Create one to get started." |
| Submitting | Button disabled with "..." indicator |
| Success | Toast with checkmark-equivalent text |
| Self-row | "You" text instead of delete button |

---

## Anti-Patterns (Don't Do)

- ❌ Don't show the password in plain text — type="password"
- ❌ Don't allow self-delete
- ❌ Don't show "Created by" or "Joined at" timestamps — out of scope
- ❌ Don't add avatar/profile picture — use color only
- ❌ Don't allow editing name/email — only create/delete
- ❌ Don't use a heavy color picker — use native `<input type="color">`
