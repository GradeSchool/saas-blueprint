# Authentication Recipe

## Overview
Basic authentication setup using Clerk with Convex.

## Prerequisites
- Clerk account
- Convex project

## Code

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_clerk_id", ["clerkId"]),
});
```

## Notes
- Always validate clerkId server-side
- Store minimal user data in Convex
