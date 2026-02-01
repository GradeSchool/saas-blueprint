---
last_updated: 2026-02-01
updated_by: vector-projector
change: "Split from billing-how-it-works.md - Overview"
---

# Chapter 1: How Billing Works (Overview)

A step-by-step guide to subscription billing. Read this first before diving into implementation details.

**Trusted resource:** [Theo's Stripe Recommendations](https://github.com/t3dotgg/stripe-recommendations) - battle-tested patterns from production experience.

---

## The Cast of Characters

**Your App** - The website users interact with. Shows UI, stores user accounts.

**Convex** - Your database. Stores everything including a local copy of billing data.

**Stripe** - The billing service. Handles money, cards, payments. You never touch credit cards directly.

**Webhooks** - Messages Stripe sends to your server when something happens.

**Reactive Queries** - Convex's magic. When data changes in the database, all connected browsers update automatically. No refresh needed.

---

## Pricing Conventions (Platform-Wide)

All SaaS apps on our platform follow this pricing structure:

### Two Subscription Tiers (Minimum)

| Tier | License | What User Can Do |
|------|---------|------------------|
| **Personal** | Personal use only | Download, print, keep for yourself. Gift to friends. **Cannot sell physical prints.** |
| **Commercial** | Commercial use | Everything in Personal, **plus** sell physical prints commercially. |

Every app will have at least these two tiers. Some apps may add more tiers later.

### Environment Variable Naming

**Convention:** `{APPNAME}_STRIPE_PRICE_{TIER}_{PERIOD}`

| App | Prefix |
|-----|--------|
| Vector Projector | `VP_` |
| Future App 2 | `FA2_` |
| etc. | etc. |

### Example: Vector Projector

| Stripe Product Name | Amount | Env Var |
|---------------------|--------|--------|
| Vector Projector Personal | $6/mo | `VP_STRIPE_PRICE_PERSONAL_MONTHLY` |
| Vector Projector Personal | $60/yr | `VP_STRIPE_PRICE_PERSONAL_YEARLY` |
| Vector Projector Commercial | $9/mo | `VP_STRIPE_PRICE_COMMERCIAL_MONTHLY` |
| Vector Projector Commercial | $90/yr | `VP_STRIPE_PRICE_COMMERCIAL_YEARLY` |

### Per-Download Fee (UNDECIDED)

> **Status:** Uncertain. May not implement.

Focus on subscription tiers first. Per-download can be added later if there's demand. Do not build infrastructure for this until explicitly decided.

---

## How Your App Stays Updated

**Webhooks write. Queries read. Reactivity pushes.**

1. Stripe sends webhook → data written to Convex
2. Your React component has `useQuery(api.billing.status)`
3. Convex detects data changed
4. Convex pushes new data to browser via WebSocket
5. React re-renders with new status

**User doesn't refresh. User doesn't re-login. It just updates.**

---

## Access Levels Summary

| State | Upload | Projects | Base Samples | 3D Scene |
|-------|--------|----------|--------------|----------|
| Anonymous | ❌ | ❌ | ✅ View | ✅ Play |
| Signed in, no subscription | ❌ | ❌ | ✅ View | ✅ Play |
| Personal (active) | ✅ | ✅ | ✅ | ✅ |
| Commercial (active) | ✅ | ✅ | ✅ | ✅ |
| Subscription past_due | ✅ | ✅ | ✅ | ✅ (grace period) |
| Subscription canceled/unpaid | ❌ | ❌ | ✅ View | ✅ Play |

**Note:** Personal vs Commercial have the same in-app access. The difference is the **license** for what they can do with exports.

---

## What You Build vs What Stripe Does

| Task | Who Does It |
|------|-------------|
| Create Products and Prices | Admin in Stripe Dashboard |
| Store Price IDs | Admin in Convex Dashboard (env vars) |
| Checkout page (card entry) | Stripe |
| Process payments | Stripe |
| Store credit cards | Stripe |
| Retry failed payments | Stripe |
| Email customers about failures | Stripe |
| Customer portal (update card, cancel) | Stripe |
| Monthly billing schedule | Stripe |
| Send webhooks | Stripe |
| **Receive webhooks** | Your app |
| **Store subscription status locally** | Your app |
| **Show UI based on status** | Your app |
| **"Subscribe" / "Manage" buttons** | Your app |
| **Restrict features based on status** | Your app |

---

## All Chapters

1. [Overview](how-it-works-01.md) ← You are here
2. [Admin Creates Products in Stripe](how-it-works-02.md)
3. [Admin Stores Price IDs in Convex](how-it-works-03.md)
4. [Human Signs Up](how-it-works-04.md)
5. [User Clicks Subscribe](how-it-works-05.md)
6. [User Pays](how-it-works-06.md)
7. [Stripe Tells You (Webhooks)](how-it-works-07.md)
8. [User Returns to Your App](how-it-works-08.md)
9. [Life is Good (Recurring Billing)](how-it-works-09.md)
10. [Payment Fails](how-it-works-10.md)
11. [User Fixes Payment](how-it-works-11.md)
12. [All Retries Fail](how-it-works-12.md)
13. [User Resubscribes](how-it-works-13.md)
14. [User Cancels](how-it-works-14.md)

---

## Related Docs

- `billing-ux-flow.md` - UX decisions for each state
- `stripe-setup.md` - Dashboard configuration steps
- `stripe.md` - Technical implementation
- [Theo's Stripe Recommendations](https://github.com/t3dotgg/stripe-recommendations)
