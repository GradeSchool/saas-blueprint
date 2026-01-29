---
last_updated: 2026-01-28
updated_by: vector-projector
change: "Added crowdfunding_backers table"
status: tested
---

# Convex Schema

Database schema patterns.

## Current Schema

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // App users (links to Better Auth via authUserId)
  users: defineTable({
    authUserId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    createdAt: v.number(),
    activeSessionId: v.optional(v.string()),
    sessionStartedAt: v.optional(v.number()),
    // Crowdfunding backer link (for tier-based billing discounts)
    crowdfundingBackerId: v.optional(v.id("crowdfunding_backers")),
  })
    .index("by_authUserId", ["authUserId"])
    .index("by_email", ["email"]),

  // Admin whitelist (email-based)
  admins: defineTable({
    email: v.string(),
    addedAt: v.number(),
    note: v.optional(v.string()),
  }).index("by_email", ["email"]),

  // App-wide state (singleton pattern)
  app_state: defineTable({
    key: v.string(),           // always "config"
    crowdfundingActive: v.boolean(),
  }).index("by_key", ["key"]),

  // Crowdfunding backers - verified MakerWorld supporters
  crowdfunding_backers: defineTable({
    username: v.string(),       // MakerWorld username
    accessCode: v.string(),     // Verification code
    tier: v.string(),           // Backer tier (affects future billing)
    usedByUserId: v.optional(v.id("users")),  // User who claimed this
    usedAt: v.optional(v.number()),           // When claimed
  })
    .index("by_username_code", ["username", "accessCode"])
    .index("by_usedByUserId", ["usedByUserId"]),
});
```

## Naming Conventions

| Element | Convention | Example |
|---------|------------|--------|
| Tables | snake_case | `app_state`, `crowdfunding_backers` |
| Columns | camelCase | `authUserId`, `accessCode` |

## Singleton Pattern (app_state)

Convex doesn't have singleton tables. We simulate one:

1. Add a `key` field, always set to `"config"`
2. Query filters by `key="config"` - only returns one row
3. Mutation does upsert - update if exists, insert if not

```typescript
// convex/appState.ts
const CONFIG_KEY = "config";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const state = await ctx.db
      .query("app_state")
      .withIndex("by_key", (q) => q.eq("key", CONFIG_KEY))
      .first();
    return state ?? { crowdfundingActive: false };
  },
});

export const set = mutation({
  args: { crowdfundingActive: v.boolean() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("app_state")
      .withIndex("by_key", (q) => q.eq("key", CONFIG_KEY))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, args);
    } else {
      await ctx.db.insert("app_state", { key: CONFIG_KEY, ...args });
    }
  },
});
```

**Usage:** `npx convex run appState:set '{"crowdfundingActive": true}'`

Don't manually add rows in dashboard - use the mutation.

## Crowdfunding Backers Pattern

The `crowdfunding_backers` table tracks MakerWorld backers who can sign up during crowdfunding.

**Key concepts:**
- Each backer has a unique username + accessCode combination
- `usedByUserId` tracks which user claimed this backer slot (one-time use)
- `tier` stores backer level for future billing discounts
- Users link back via `crowdfundingBackerId` field

**Add a backer:**
```bash
npx convex run crowdfundingBackers:addBacker '{"username": "user123", "accessCode": "ABC123", "tier": "Gold"}'
```

See [../04-auth/crowdfunding-mode.md](../04-auth/crowdfunding-mode.md) for full flow.

## Tables Overview

| Table | Purpose |
|-------|--------|
| `users` | App-specific user data, session tracking, backer link |
| `admins` | Email whitelist for admin access |
| `app_state` | Global app configuration (singleton) |
| `crowdfunding_backers` | MakerWorld backer verification |

## Related

- [users.md](users.md) - User management patterns
- [setup.md](setup.md) - Initial Convex setup
- [../04-auth/crowdfunding-mode.md](../04-auth/crowdfunding-mode.md) - Crowdfunding auth flow