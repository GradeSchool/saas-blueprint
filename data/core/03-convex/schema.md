---
last_updated: 2026-02-10
updated_by: vector-projector
change: "Added alerts, pricing_catalog tables; updated users and crowdfunding_backers fields"
status: tested
tldr: "Database schema patterns for Convex including users, sessions, and crowdfunding tables."
topics: [convex, schema, database, backend]
---

# Convex Schema

Database schema patterns for core SaaS functionality.

## Core Tables

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
    // Session enforcement
    activeSessionId: v.optional(v.string()),
    sessionStartedAt: v.optional(v.number()),
    // Crowdfunding backer link
    crowdfundingBackerId: v.optional(v.id("crowdfunding_backers")),
    // Backer access period (authoritative for access checks)
    backerAccessGrantedAt: v.optional(v.number()),
    backerAccessUntil: v.optional(v.number()),
    // Alert tracking
    lastSeenAlertAt: v.optional(v.number()),
  })
    .index("by_authUserId", ["authUserId"])
    .index("by_email", ["email"]),

  // Admin whitelist (email-based)
  admins: defineTable({
    email: v.string(),
    addedAt: v.number(),
    note: v.optional(v.string()),
  }).index("by_email", ["email"]),

  // Admin alerts - broadcast messages to all users
  alerts: defineTable({
    message: v.string(),
    createdAt: v.number(),
    createdBy: v.id("users"),
  }).index("by_createdAt", ["createdAt"]),

  // App-wide state (singleton pattern)
  app_state: defineTable({
    key: v.string(),           // always "config"
    crowdfundingActive: v.boolean(),
  }).index("by_key", ["key"]),

  // Crowdfunding backers - verified MakerWorld supporters
  crowdfunding_backers: defineTable({
    username: v.string(),
    usernameLower: v.optional(v.string()),  // normalized for lookup
    accessCode: v.string(),
    tier: v.string(),
    usedByUserId: v.optional(v.id("users")),
    usedAt: v.optional(v.number()),
    // Short-lived claim token for verification flow
    pendingClaimToken: v.optional(v.string()),
    pendingClaimExpiresAt: v.optional(v.number()),
    // Access period granted (audit trail)
    accessGrantedAt: v.optional(v.number()),
    accessUntil: v.optional(v.number()),
  })
    .index("by_username_code", ["username", "accessCode"])
    .index("by_usernameLower_code", ["usernameLower", "accessCode"])
    .index("by_usedByUserId", ["usedByUserId"]),

  // Pricing catalog - snapshot of Stripe products/prices
  // Singleton pattern: key="catalog"
  pricing_catalog: defineTable({
    key: v.string(),  // always "catalog"
    products: v.array(
      v.object({
        productId: v.string(),
        name: v.string(),
        description: v.optional(v.string()),
        images: v.optional(v.array(v.string())),
        active: v.boolean(),
        metadata: v.record(v.string(), v.string()),
      })
    ),
    prices: v.array(
      v.object({
        priceId: v.string(),
        productId: v.string(),
        unitAmount: v.number(),
        currency: v.string(),
        type: v.optional(v.string()),      // "one_time" or "recurring"
        interval: v.optional(v.string()),  // "month" or "year"
        active: v.boolean(),
        lookupKey: v.optional(v.string()), // "personal" or "commercial"
        nickname: v.optional(v.string()),
        metadata: v.record(v.string(), v.string()),
      })
    ),
    lastSyncedAt: v.number(),
    lastSyncError: v.optional(v.string()),
    lastSyncFailedAt: v.optional(v.number()),
  }).index("by_key", ["key"]),
});
```

## Naming Conventions

| Element | Convention | Example |
|---------|------------|--------|
| Tables | snake_case | `app_state`, `crowdfunding_backers` |
| Columns | camelCase | `authUserId`, `accessCode` |

## Tables Overview

| Table | Purpose |
|-------|--------|
| `users` | App-specific user data, session tracking, backer link |
| `admins` | Email whitelist for admin access |
| `alerts` | Admin broadcast messages to users |
| `app_state` | Global app configuration (singleton) |
| `crowdfunding_backers` | MakerWorld backer verification |
| `pricing_catalog` | Stripe products/prices snapshot |

## Singleton Pattern

Convex doesn't have singleton tables. We simulate one:

1. Add a `key` field, always set to `"config"` (or `"catalog"`)
2. Query filters by key - only returns one row
3. Mutation does upsert - update if exists, insert if not

```typescript
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
```

## App-Specific Tables

Each app adds its own tables for domain-specific data (projects, files, etc.). See `domains/{app}` for app-specific schemas.

## Related

- [users.md](users.md) - User management patterns
- [setup.md](setup.md) - Initial Convex setup
- [../04-auth/crowdfunding-mode.md](../04-auth/crowdfunding-mode.md) - Crowdfunding auth flow
- [../06-payments/convex-stripe-component-overview.md](../06-payments/convex-stripe-component-overview.md) - Stripe integration