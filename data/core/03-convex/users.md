---
last_updated: 2026-01-27
updated_by: vector-projector
change: "Updated to reflect actual implementation - all features complete"
status: tested
tldr: "App user table pattern that links to Better Auth. Separate concerns cleanly."
topics: [convex, users, auth, database, patterns]
---

# App User Tables

Pattern for managing app-specific user data alongside Better Auth.

## Architecture

```
┌─────────────────────────┐     ┌─────────────────────────┐
│   betterAuth:user       │     │      users              │
│   (Better Auth)         │     │      (App)              │
├─────────────────────────┤     ├─────────────────────────┤
│ _id                     │←───→│ authUserId              │
│ email                   │     │ email                   │
│ name                    │     │ name                    │
│ emailVerified           │     │ activeSessionId         │
│                         │     │ sessionStartedAt        │
└─────────────────────────┘     └─────────────────────────┘

                                ┌─────────────────────────┐
                                │      admins             │
                                │      (Email whitelist)  │
                                ├─────────────────────────┤
                                │ email                   │
                                │ addedAt                 │
                                │ note                    │
                                └─────────────────────────┘
```

## Schema

```typescript
// convex/schema.ts
users: defineTable({
  authUserId: v.string(),
  email: v.string(),
  name: v.optional(v.string()),
  createdAt: v.number(),
  activeSessionId: v.optional(v.string()),
  sessionStartedAt: v.optional(v.number()),
})
  .index("by_authUserId", ["authUserId"])
  .index("by_email", ["email"]),

admins: defineTable({
  email: v.string(),
  addedAt: v.number(),
  note: v.optional(v.string()),
}).index("by_email", ["email"]),
```

## ensureAppUser Mutation

Called on every sign-in. Creates app user if needed, generates session.

```typescript
// convex/users.ts
export const ensureAppUser = mutation({
  args: {},
  handler: async (ctx) => {
    const authUser = await authComponent.getAuthUser(ctx)
    if (!authUser) throw new Error('Not authenticated')
    
    const existingUser = await ctx.db.query('users')
      .withIndex('by_authUserId', q => q.eq('authUserId', authUser._id))
      .unique()
    
    const sessionId = crypto.randomUUID()
    const now = Date.now()
    
    let appUser
    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        activeSessionId: sessionId,
        sessionStartedAt: now,
      })
      appUser = existingUser
    } else {
      const userId = await ctx.db.insert('users', {
        authUserId: authUser._id,
        email: authUser.email,
        name: authUser.name ?? undefined,
        createdAt: now,
        activeSessionId: sessionId,
        sessionStartedAt: now,
      })
      appUser = await ctx.db.get(userId)
    }
    
    // Check admin status
    const adminRecord = await ctx.db.query('admins')
      .withIndex('by_email', q => q.eq('email', authUser.email))
      .unique()
    
    return {
      userId: appUser._id,
      email: appUser.email,
      name: appUser.name,
      isAdmin: adminRecord !== null,
      sessionId,
    }
  },
})
```

## Admin System

**How it works:**
1. Add email to `admins` table in Convex dashboard
2. User signs in normally
3. `ensureAppUser` checks admins table
4. Returns `isAdmin: true` if email found
5. App routes to AdminPage instead of UserPage

**Adding an admin (Convex Dashboard):**
```json
{
  "email": "admin@example.com",
  "addedAt": 1706400000000,
  "note": "Founder"
}
```

## UI Routing

```tsx
// App.tsx
{currentPage === 'user' ? (
  effectiveAppUser?.isAdmin ? (
    <AdminPage onSignOut={handleSignOut} />
  ) : (
    <UserPage onSignOut={handleSignOut} />
  )
) : (
  // Main app content
)}
```

## Key Files

| File | Purpose |
|------|--------|
| `convex/schema.ts` | Table definitions |
| `convex/users.ts` | `ensureAppUser`, `validateSession`, `getCurrentAppUser` |
| `src/App.tsx` | Admin routing logic |
| `src/components/AdminPage.tsx` | Admin-only page |
| `src/components/UserPage.tsx` | Regular user page |

## Related

- [schema.md](schema.md) - Full schema
- [../04-auth/better-auth.md](../04-auth/better-auth.md) - Auth setup
- [../02-frontend/admin-panel.md](../02-frontend/admin-panel.md) - Admin UI