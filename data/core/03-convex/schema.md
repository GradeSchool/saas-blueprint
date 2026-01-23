---
last_updated: 2026-01-23
updated_by: saas-blueprint
change: "Initial Convex schema patterns"
---

# Convex Schema

Database schema patterns.

## Plan

Convex Pro ($25/mo) for:
- 100 GB storage included
- 50 GB bandwidth included
- Higher function/database limits

## Base Schema

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  users: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  projects: defineTable({
    userId: v.id("users"),
    name: v.string(),
    data: v.any(), // project-specific data
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),
})
```

## Notes

- Use indexes for all queries
- Keep schema minimal
- `v.any()` for flexible project data
