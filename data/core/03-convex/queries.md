---
last_updated: 2026-01-23
updated_by: saas-blueprint
change: "Initial query and mutation patterns"
---

# Convex Queries & Mutations

Backend function patterns.

## Query Pattern

```typescript
// convex/projects.ts
import { query } from "./_generated/server"
import { v } from "convex/values"

export const list = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect()
  },
})
```

## Mutation Pattern

```typescript
export const save = mutation({
  args: {
    id: v.optional(v.id("projects")),
    name: v.string(),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    if (args.id) {
      await ctx.db.patch(args.id, {
        name: args.name,
        data: args.data,
        updatedAt: now,
      })
      return args.id
    }

    return await ctx.db.insert("projects", {
      ...args,
      createdAt: now,
      updatedAt: now,
    })
  },
})
```

## Notes

- Use indexes for all queries
- Keep mutations simple
- Validate on server, not just client