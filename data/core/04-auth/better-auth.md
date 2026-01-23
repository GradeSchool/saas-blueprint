---
last_updated: 2026-01-23
updated_by: saas-blueprint
change: "Initial better-auth setup"
---

# better-auth

Authentication with better-auth and Convex.

## Reference

- [Convex better-auth docs](https://docs.convex.dev/auth/better-auth)
- [better-auth docs](https://www.better-auth.com/)

## Why better-auth

- Open source
- Works with Convex
- Self-hosted (no third-party dependency)
- Simple API

## Setup

TODO: Add setup steps

## Convex Schema

```typescript
// convex/schema.ts
users: defineTable({
  email: v.string(),
  name: v.optional(v.string()),
  image: v.optional(v.string()),
  createdAt: v.number(),
}).index("by_email", ["email"]),

sessions: defineTable({
  userId: v.id("users"),
  token: v.string(),
  expiresAt: v.number(),
}).index("by_token", ["token"]),
```

## Client Setup

TODO: Add client configuration

## Protected Routes

TODO: Add route protection pattern

## Notes

- Store minimal user data
- Validate sessions server-side
- Handle token refresh
