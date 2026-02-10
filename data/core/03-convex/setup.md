---
last_updated: 2026-01-29
updated_by: vector-projector
change: "Added frontmatter metadata for agent context planning"
status: tested
context_cost: 1.5KB
type: setup
requires: [core/01-setup/stack.md]
unlocks: [core/04-auth/better-auth.md]
tldr: "Basic Convex backend setup. Install, configure provider, first query. Do before auth."
topics: [convex, backend, setup, database]
---

# Convex Setup

Basic Convex backend setup. Do this after frontend scaffolding, before auth.

---

## Installation

```bash
npm install convex
```

## Initialize

**User must run this** (agents cannot run dev servers):

```bash
npx convex dev
```

This creates `convex/` folder and `.env.local` with deployment URL.

**Keep `npx convex dev` running** during development.

---

## Environment Variables

After init, `.env.local` contains:

```bash
CONVEX_DEPLOYMENT=dev:your-project-name
VITE_CONVEX_URL=https://your-project.convex.cloud
```

---

## Basic Schema

**convex/schema.ts:**

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Your app tables go here
  // Better Auth manages its own tables separately
});
```

---

## Wire Up Provider

**src/main.tsx:**

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

**Note:** If using Better Auth, use `ConvexBetterAuthProvider` instead.

---

## Verify

```bash
npm run build
```

---

## Related

- [../04-auth/better-auth.md](../04-auth/better-auth.md) - Next: Authentication
- [schema.md](schema.md) - Schema patterns
- [queries.md](queries.md) - Query patterns