---
last_updated: 2026-01-27
updated_by: vector-projector
change: "Updated with actual implementation"
status: tested
---

# Admin Panel

Separate admin experience from regular users.

## Architecture

- Admins identified by email whitelist (separate `admins` table)
- Same auth flow as regular users (email/password or Google)
- Different page shown when clicking "User" button

## Admin Detection

```typescript
// In ensureAppUser mutation
const adminRecord = await ctx.db.query('admins')
  .withIndex('by_email', q => q.eq('email', authUser.email))
  .unique()

return {
  // ... other fields
  isAdmin: adminRecord !== null,
}
```

## Schema

```typescript
// convex/schema.ts
admins: defineTable({
  email: v.string(),
  addedAt: v.number(),
  note: v.optional(v.string()),
}).index("by_email", ["email"]),
```

## Adding Admins

Manually in Convex dashboard (Data → admins → Add document):

```json
{
  "email": "admin@example.com",
  "addedAt": 1706400000000,
  "note": "Founder"
}
```

No admin-creation UI needed. Intentionally manual and secure.

## UI Routing

```tsx
// App.tsx
{currentPage === 'user' ? (
  effectiveAppUser?.isAdmin ? (
    <AdminPage onBack={() => setCurrentPage('main')} onSignOut={handleSignOut} />
  ) : (
    <UserPage onBack={() => setCurrentPage('main')} onSignOut={handleSignOut} />
  )
) : (
  // Main content
)}
```

## AdminPage Component

```tsx
// src/components/AdminPage.tsx
import { authClient } from '@/lib/auth-client'

interface AdminPageProps {
  onBack: () => void
  onSignOut: () => void
}

export function AdminPage({ onBack, onSignOut }: AdminPageProps) {
  const handleSignOut = async () => {
    onSignOut() // Navigate away first to avoid flicker
    await authClient.signOut()
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Admin banner */}
      <div className="bg-purple-600 text-white px-4 py-2 text-center font-semibold">
        Logged in as Admin
      </div>

      <div className="flex-1 p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <button onClick={onBack}>← Back to app</button>
          </div>

          {/* Admin features */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-100 rounded-lg p-4">
              <h3 className="font-medium">User Management</h3>
            </div>
            <div className="bg-gray-100 rounded-lg p-4">
              <h3 className="font-medium">Analytics</h3>
            </div>
          </div>

          <button onClick={handleSignOut} className="bg-red-500 text-white">
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
```

## Sign Out Pattern

**Important:** Navigate away BEFORE calling signOut to avoid UI flicker.

```typescript
const handleSignOut = async () => {
  onSignOut() // Changes currentPage, hides AdminPage
  await authClient.signOut() // Then sign out
}
```

## Related

- [../04-auth/better-auth.md](../04-auth/better-auth.md) - Auth setup
- [../03-convex/users.md](../03-convex/users.md) - User/admin tables
- [../03-convex/schema.md](../03-convex/schema.md) - Schema definition