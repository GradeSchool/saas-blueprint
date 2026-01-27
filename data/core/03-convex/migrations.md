---
last_updated: 2026-01-27
updated_by: vector-projector
change: "Initial migrations documentation"
---

# Migrations

Step-by-step patterns for changing Convex schemas with existing data.

## The Rule

**Schema must match existing data.** You can't delete or rename fields that have data. Move data first, then change schema.

## Adding a Field

**Safe.** No migration needed.

```typescript
// schema.ts - just add it
users: defineTable({
  email: v.string(),
  name: v.optional(v.string()),  // NEW - optional is safe
})
```

Deploy. Done.

## Removing a Field

**Step 1:** Clear the data

```typescript
// migrations.ts
export const clearOldField = mutation({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db.query("users").collect()
    for (const doc of docs) {
      await ctx.db.patch(doc._id, { oldField: undefined })
    }
  },
})
```

**Step 2:** Run migration in dashboard (Functions → Run)

**Step 3:** Remove field from schema, deploy

## Renaming a Field

**Step 1:** Add new field to schema (optional), deploy

**Step 2:** Copy data

```typescript
export const copyToNewField = mutation({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db.query("users").collect()
    for (const doc of docs) {
      if (doc.oldName && !doc.newName) {
        await ctx.db.patch(doc._id, { 
          newName: doc.oldName,
          oldName: undefined 
        })
      }
    }
  },
})
```

**Step 3:** Run migration

**Step 4:** Update code to use new field, deploy

**Step 5:** Remove old field from schema, deploy

## Changing a Field Type

Same as rename - add new field, migrate, remove old.

```typescript
// string -> number example
export const convertType = mutation({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db.query("items").collect()
    for (const doc of docs) {
      if (typeof doc.count === "string") {
        await ctx.db.patch(doc._id, { 
          count: parseInt(doc.count, 10) 
        })
      }
    }
  },
})
```

## Backfilling Data

Populate a new field for existing rows.

```typescript
export const backfillDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db.query("users").collect()
    for (const doc of docs) {
      if (doc.plan === undefined) {
        await ctx.db.patch(doc._id, { plan: "free" })
      }
    }
  },
})
```

## Large Tables

For tables with many rows, batch the work:

```typescript
export const migrateBatch = mutation({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, { cursor }) => {
    const results = await ctx.db.query("users")
      .paginate({ cursor, numItems: 100 })
    
    for (const doc of results.page) {
      await ctx.db.patch(doc._id, { /* changes */ })
    }
    
    return { 
      done: results.isDone, 
      cursor: results.continueCursor 
    }
  },
})
```

Run repeatedly until `done: true`.

## After Migration

Delete migration functions from your code. They're one-time use.

## Related

- [Dev vs Production](dev-v-prod.md) - Deployment workflow
- [Schema](schema.md) - Schema design