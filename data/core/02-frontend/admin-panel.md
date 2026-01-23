---
last_updated: 2026-01-23
updated_by: saas-blueprint
change: "Initial admin panel concept"
---

# Admin Panel

Separate admin experience from regular users.

## Concept

- Admins stored in separate Convex table (not just a flag on users)
- Auth flow checks admin table first, before user auth
- If admin: render admin panel
- If user: render normal app

## Why Separate Table

- Clear separation of concerns
- Easy to query "all admins"
- Can have admin-specific fields (permissions, role, etc.)
- Harder to accidentally grant admin via user table manipulation

## Auth Flow

```
1. User authenticates (better-auth)
2. Check: Is user.email in admins table?
   → Yes: Show AdminPanel
   → No: Show UserPanel
```

## Admin Capabilities

TODO: Define per-app, but common patterns:
- View all users
- View analytics/metrics
- Manage subscriptions
- Feature flags
- Content moderation
- System settings

## Schema

```typescript
// convex/schema.ts
admins: defineTable({
  email: v.string(),
  role: v.optional(v.string()), // "super", "support", etc.
  addedAt: v.number(),
  addedBy: v.optional(v.string()),
}).index("by_email", ["email"]),
```

## Related

- [better-auth.md](../04-auth/better-auth.md) - Authentication setup
- [schema.md](../03-convex/schema.md) - Database patterns
