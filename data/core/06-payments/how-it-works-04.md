---
last_updated: 2026-02-01
updated_by: vector-projector
change: "Split from billing-how-it-works.md"
---

# Chapter 4: Human Signs Up

---

## What Happens

1. Human visits your app
2. Human creates account (email/password or Google)
3. **Human is now a User.** Account is created in your database (`users` table)
4. User has NO subscription yet
5. User can browse, explore, use free features

---

## What Should Happen

1. User record exists in `users` table
2. App runs a reactive query to check subscription status:
   ```typescript
   const subscription = useQuery(api.billing.getSubscriptionStatus)
   ```
3. Query returns `null` or `undefined` (no subscription exists for this user)
4. App knows: this user is signed in but NOT subscribed
5. **User remains in Discovery Mode:**
   - Can view base samples (STL, SVG)
   - Can manipulate the 3D scene
   - **CANNOT upload files**
   - **CANNOT start/save projects**
   - **CANNOT access subscriber-only features**
6. App prompts user to subscribe
   - **UX undecided:** Modal? Icon/badge on User button? Both?

---

## Key Insight

Signing up does NOT equal subscribing. A signed-in user with no subscription is still in Discovery Mode, just like an anonymous visitor. The only difference: we know who they are.

---

## What Can Go Wrong

- Auth issues (separate from billing, see auth docs)
- Query fails (network issue, show retry state)

---

[← Chapter 3: Admin Stores Price IDs](how-it-works-03.md) | [Chapter 5: User Clicks Subscribe →](how-it-works-05.md)
