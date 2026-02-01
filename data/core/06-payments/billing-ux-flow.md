---
last_updated: 2026-02-01
updated_by: vector-projector
change: "Initial draft - billing UX flow"
status: draft
---

# Billing UX Flow

How users interact with subscription billing. Admins do not deal with billing.

**Status:** Draft - thinking through the flow.

---

## Mental Model

**Separation of concerns:**
- **Account** = Better Auth user + our `users` table (identity, session)
- **Billing** = Stripe component tables (customer, subscription, payments)
- **Link** = `userId` field in Stripe tables matches `authUserId` in our users table

**Key principle:** Keep billing checks non-blocking and non-jarring. User should be able to use the app, with gentle nudges when billing needs attention.

---

## Convex Stripe Component Architecture

The component creates its own namespaced tables:

| Table | Key Fields | Our Link |
|-------|------------|----------|
| `customers` | stripeCustomerId, email | - |
| `subscriptions` | status, currentPeriodEnd, cancelAtPeriodEnd, **userId** | userId = authUserId |
| `payments` | amount, status, **userId** | userId = authUserId |
| `invoices` | status, amountDue, **userId** | userId = authUserId |

**Important:** The `userId` field stores `identity.subject` (the auth user ID), NOT a Convex document ID. This matches our `users.authUserId` field.

---

## Subscription States

From Stripe, the `status` field can be:

| Status | Meaning | UX Response |
|--------|---------|-------------|
| `active` | Paid and current | Full access |
| `trialing` | In trial period | Full access + trial indicator |
| `past_due` | Payment failed, retrying | Warning, prompt to update payment |
| `canceled` | Subscription ended | Prompt to resubscribe |
| `incomplete` | Initial payment failed | Prompt to complete payment |
| `incomplete_expired` | Never completed | Prompt to subscribe |
| `unpaid` | Invoice unpaid after retries | Restrict access, payment required |
| `paused` | Subscription paused | Prompt to resume |

---

## User Flow: Login

```
User logs in (Better Auth)
       ↓
ensureAppUser runs
       ↓
App loads, check subscription status
       ↓
   ┌───┴───────────────────┐
   │                       │
No subscription     Has subscription
   │                       │
   ↓                       ↓
New user flow        Check status
                           │
              ┌────────────┼────────────┐
              │            │            │
           active      past_due     canceled/
              │            │         unpaid
              ↓            ↓            ↓
         Full access   Red dot on   Modal or
                       User button  restricted
```

---

## UX Options for Billing Issues

### Option A: Red Dot Indicator (Less Intrusive)

- Red dot appears on User button in header
- User can continue using app
- Clicking User button shows billing alert in User page
- Good for: past_due (payment retrying)

### Option B: Modal (More Urgent)

- Modal appears after login
- User must acknowledge (can dismiss)
- Good for: unpaid, canceled, incomplete_expired

### Option C: Restricted Access

- Core features locked
- Only billing management available
- Good for: unpaid after grace period

**Recommendation:** Start with Option A (red dot) for most cases. Reserve modals for truly urgent situations (account about to be suspended).

---

## New User Flow (No Subscription)

User just signed up, hasn't subscribed yet.

**Options:**

1. **Free tier exists** → User has limited access, upgrade prompts
2. **No free tier** → Must subscribe to use app
3. **Trial period** → Full access for X days, then prompt

**For Vector Projector:** TBD - depends on business model.

---

## Checking Subscription Status

Query the Stripe component:

```typescript
import { components } from "./_generated/api";

// In a query or action:
const subscriptions = await ctx.runQuery(
  components.stripe.public.listSubscriptionsByUserId,
  { userId: authUserId }
);

// Find active subscription
const activeSubscription = subscriptions.find(
  sub => sub.status === "active" || sub.status === "trialing"
);

if (!activeSubscription) {
  // No active subscription
}

if (activeSubscription.status === "past_due") {
  // Payment issue, show warning
}
```

---

## Where to Check

**Option 1: On every page load (reactive)**
- Use Convex query that checks subscription
- Real-time updates if subscription changes
- More queries, but always accurate

**Option 2: On login only (cached)**
- Check once at login, store result on user record
- Faster subsequent loads
- May show stale data if subscription changes

**Option 3: Hybrid**
- Store subscription status on user record for quick access
- Webhook updates the cached status when Stripe events occur
- Best of both worlds

**Recommendation:** Option 3 (Hybrid) - cache on user record, update via webhooks.

---

## Schema Addition (Potential)

Add to `users` table for quick subscription checks:

```typescript
users: defineTable({
  // ... existing fields ...
  
  // Subscription cache (updated by Stripe webhooks)
  subscriptionStatus: v.optional(v.string()), // "active", "past_due", etc.
  subscriptionPeriodEnd: v.optional(v.number()), // timestamp
  stripeCustomerId: v.optional(v.string()), // for quick lookup
})
```

Webhook handler updates these fields when subscription changes.

---

## Admin Exemption

Admins should not see billing prompts or restrictions.

```typescript
if (user.isAdmin) {
  // Skip all billing checks
  return;
}
```

---

## Open Questions

1. Do we have a free tier, or is subscription required?
2. What's the grace period for past_due before restricting access?
3. Should we allow discovery mode (anonymous) to continue working regardless of billing?
4. Do we want trial periods? How long?
5. What features are locked vs available when subscription lapses?

---

## Related Docs

- `/core/06-payments/stripe.md` - Stripe component setup
- `/core/04-auth/better-auth.md` - Authentication
- `/core/02-frontend/alerts.md` - Alert patterns for billing notifications