---
last_updated: 2026-01-23
updated_by: vector-projector
change: "Complete Convex setup guide"
status: tested
---

# Convex Setup

Basic Convex backend setup. Do this after frontend scaffolding, before auth.

## Prerequisites

- Frontend scaffolded (see [../01-setup/stack.md](../01-setup/stack.md))
- Convex account at [convex.dev](https://convex.dev)
- Create a new project in Convex dashboard

## Installation

```bash
npm install convex
```

## Initialize Convex

**You must run this command** (agent cannot run dev servers):

```bash
npx convex dev
```

This will:
1. Prompt you to log in (if needed)
2. Ask which project to link to
3. Create `convex/` folder with `_generated/` types
4. Create `.env.local` with your deployment URL

**Keep `npx convex dev` running** during development. It syncs your schema and functions.

## Environment Variables

After init, `.env.local` will contain:

```bash
CONVEX_DEPLOYMENT=dev:your-project-name
VITE_CONVEX_URL=https://your-project.convex.cloud
```

The `VITE_` prefix makes it available to the frontend.

## Basic Schema

Create `convex/schema.ts`:

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Your app tables go here
  // Better Auth manages its own tables separately
});
```

## Wire Up Provider

Update `src/main.tsx`:

```tsx
import { ConvexReactClient } from 'convex/react'
import { ConvexProvider } from 'convex/react'

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConvexProvider client={convex}>
      <App />
    </ConvexProvider>
  </StrictMode>,
)
```

**Note:** If using Better Auth, use `ConvexBetterAuthProvider` instead (see [../04-auth/better-auth.md](../04-auth/better-auth.md)).

## Verify Setup

```bash
npm run build
```

Should pass. Check Convex dashboard - your tables should appear.

## Next Steps

1. [../04-auth/better-auth.md](../04-auth/better-auth.md) - Add authentication
2. [schema.md](schema.md) - Schema patterns
3. [queries.md](queries.md) - Query patterns

## Related

- [../01-setup/stack.md](../01-setup/stack.md) - Project scaffolding (do first)
- [../04-auth/better-auth.md](../04-auth/better-auth.md) - Authentication (do next)