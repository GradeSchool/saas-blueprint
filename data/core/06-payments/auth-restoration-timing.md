---
last_updated: 2026-02-09
updated_by: vector-projector
change: "Updated code examples for one-time payments model"
tldr: "Handling auth state after external redirects (Stripe, OAuth). Timing fix."
topics: [auth, stripe, redirect, timing, debugging]
---

# Auth Restoration After External Redirects

When users return from external redirects (Stripe checkout, OAuth, etc.), there's a brief window where auth isn't ready.

## The Problem

After redirect back to your app:
1. Browser loads your app
2. Auth cookies exist but session isn't fully restored yet
3. Components mount and queries fire immediately
4. `authComponent.getAuthUser()` **throws** instead of returning null
5. Uncaught error crashes the component

## The Fix

Wrap `getAuthUser()` in try-catch for any query that might run during page load:

```typescript
// BAD - can throw during auth restoration
export const hasAccess = query({
  handler: async (ctx) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) return { hasAccess: false };
    // ...
  },
});

// GOOD - handles restoration gracefully
export const hasAccess = query({
  handler: async (ctx) => {
    let authUser;
    try {
      authUser = await authComponent.getAuthUser(ctx);
    } catch {
      return { hasAccess: false, reason: "not_authenticated" };
    }
    if (!authUser) {
      return { hasAccess: false, reason: "not_authenticated" };
    }
    // ...
  },
});
```

## When This Matters

Queries that:
- Run on page load (via `useQuery` in components that mount immediately)
- Are called from pages users land on after external redirects

Examples:
- Checkout success page → `hasAccess` query
- OAuth callback → user profile query
- Any "return URL" from a third-party service

## When It Doesn't Matter

- Mutations (user explicitly triggers, auth should be ready)
- Queries on pages users navigate to within the app
- Queries with explicit loading states that wait for auth

## Convex Reactivity Saves You

Even if the query returns a fallback value initially, Convex reactivity will re-run it once auth is restored. The UI updates automatically - users just see a brief loading state.