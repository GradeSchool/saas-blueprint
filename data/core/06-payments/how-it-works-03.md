---
last_updated: 2026-02-01
updated_by: vector-projector
change: "Split from billing-how-it-works.md"
---

# Chapter 3: Admin Stores Price IDs in Convex

**Now you have Price IDs. Where do they go?**

The Convex Stripe component needs Price IDs to create checkout sessions. Store them as **environment variables** in the Convex Dashboard.

---

## What Happens

1. Admin opens Convex Dashboard (dashboard.convex.dev)
2. Navigate to: **Settings → Environment Variables**
3. Add variables for each price (with app prefix):

```
VP_STRIPE_PRICE_PERSONAL_MONTHLY = price_1ABC...
VP_STRIPE_PRICE_PERSONAL_YEARLY = price_1DEF...
VP_STRIPE_PRICE_COMMERCIAL_MONTHLY = price_1GHI...
VP_STRIPE_PRICE_COMMERCIAL_YEARLY = price_1JKL...
```

4. Save

---

## What Should Happen

- 4 Price IDs stored securely in Convex
- Your code can access them via `process.env.VP_STRIPE_PRICE_PERSONAL_MONTHLY`, etc.
- When creating checkout, you pick the right one based on user's tier choice

---

## What Can Go Wrong

- Typo in a Price ID
- Forgot to set them in production (works in dev, fails in prod)
- Used Test mode Price IDs in production (or vice versa)
- Forgot to update when you change pricing in Stripe

---

## Why This Feels Weird (But Is Normal)

Yes, manually copying IDs between dashboards feels brittle. But this is the documented pattern for the Convex Stripe component. It works because:

- Subscription prices rarely change
- When they do, you update env vars
- It's explicit and debuggable

**The alternative** (syncing products/prices via webhooks) requires building custom infrastructure the component doesn't provide. For a simple SaaS with 2-4 tiers, env vars are fine.

---

## When You Change Pricing

1. Create new Price in Stripe (don't delete the old one - existing subscribers use it)
2. Update the env var in Convex
3. New subscribers get new price
4. Existing subscribers stay on old price until they cancel/resubscribe

---

[← Chapter 2: Admin Creates Products](how-it-works-02.md) | [Chapter 4: Human Signs Up →](how-it-works-04.md)
