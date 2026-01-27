---
last_updated: 2026-01-25
updated_by: vector-projector
change: "Added decisions: admins separate, managed in Convex dashboard"
status: draft
---

# App User Tables

Pattern for managing app-specific user data alongside Better Auth.

## Decisions Made

| Decision | Choice |
|----------|--------|
| Separate users and admins tables? | **Yes** - 100% separate |
| Can someone be both? | **No** - mutually exclusive identities |
| How are admins created? | **Directly in Convex dashboard** |
| Different UI for admins? | **Yes** - admins see different page when clicking User button |

## The Two-Table Pattern

Better Auth manages auth identity. Your app manages business data. Keep them separate.

```
┌─────────────────────────────┐      ┌─────────────────────────────┐
│   betterAuth/user           │      │      app/users              │
│   (owned by Better Auth)    │      │      (owned by app)         │
├─────────────────────────────┤      ├─────────────────────────────┤
│ _id                         │←────→│ authId                      │
│ email                       │      │ createdAt                   │
│ name                        │      │ (app-specific fields)       │
│ emailVerified               │      │                             │
└─────────────────────────────┘      └─────────────────────────────┘

                                     ┌─────────────────────────────┐
                                     │      app/admins             │
                                     │      (100% separate)        │
                                     ├─────────────────────────────┤
                                     │ authId                      │
                                     │ createdAt                   │
                                     │ (admin-specific fields)     │
                                     └─────────────────────────────┘
```

**Why separate admins table?**
- Security isolation - if users table compromised, admin data is separate
- No accidental admin/user confusion
- Different fields/permissions can evolve independently
- Clear audit trail
- Admins managed directly in Convex dashboard (no UI needed)

## Admin Creation

Admins are created manually in Convex dashboard:

1. User signs in with Google OAuth (creates Better Auth user)
2. Admin (you) goes to Convex dashboard → Data → admins table
3. Insert new document with `authId` matching the Better Auth user's `_id`

No admin-creation UI in the app. Simple, secure, intentional.

## UI Routing

When authenticated user clicks "User" button:

```
Check: Is authId in admins table?
  → Yes: Show admin page
  → No: Show regular user page
```

Admins can do everything users can do, plus see admin-specific features.

## The "Ensure User Exists" Pattern

**Problem:** When a user authenticates, Better Auth creates their auth record, but we need a corresponding app record.

**Solution:** Check and create on first authenticated action.

```typescript
// convex/users.ts
import { mutation } from "./_generated/server";
import { authComponent } from "./auth";

export const ensureUser = mutation({
  args: {},
  handler: async (ctx) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) throw new Error("Not authenticated");

    // Check if this is an admin (admins don't get user records)
    const isAdmin = await ctx.db
      .query("admins")
      .withIndex("by_authId", (q) => q.eq("authId", authUser._id))
      .first();
    
    if (isAdmin) return { type: "admin", data: isAdmin };

    // Check if app user exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_authId", (q) => q.eq("authId", authUser._id))
      .first();

    if (existing) return { type: "user", data: existing };

    // Create with defaults
    const userId = await ctx.db.insert("users", {
      authId: authUser._id,
      createdAt: Date.now(),
    });

    return { type: "user", data: await ctx.db.get(userId) };
  },
});
```

## Schema (Draft)

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    authId: v.string(), // Better Auth user._id
    createdAt: v.number(),
    // TBD: app-specific fields
  }).index("by_authId", ["authId"]),

  admins: defineTable({
    authId: v.string(), // Better Auth user._id
    createdAt: v.number(),
    // TBD: admin-specific fields
  }).index("by_authId", ["authId"]),
});
```

## Status

**Decisions made:**
- [x] Two separate tables (users, admins)
- [x] Mutually exclusive identities
- [x] Admins created via Convex dashboard
- [x] Different UI for admins vs users

**Not yet implemented:**
- [ ] Schema definition in codebase
- [ ] ensureUser mutation
- [ ] Admin check query
- [ ] UI routing based on user type

**Blocked by:**
- Testing email/password sign-up flow
- Testing sessions strategy
- General auth flow testing

## Related

- [../04-auth/better-auth.md](../04-auth/better-auth.md) - Auth setup
- [../04-auth/signup-signin-sessions-flow.md](../04-auth/signup-signin-sessions-flow.md) - Full flow guide
- [setup.md](setup.md) - Convex setup