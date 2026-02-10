---
last_updated: 2026-02-09
updated_by: vector-projector
change: "Expanded Fraud Prevention section with specific actions"
tldr: "Implementation patterns for Stripe. Based on Theo's recommendations."
topics: [stripe, payments, best-practices]
---

# Stripe Best Practices

Based on [Theo's Stripe Implementation Guide](https://github.com/t3dotgg/stripe-recommendations) with adaptations for our Convex + one-time payments setup.

---

## The Core Problem

Stripe has a "split brain" problem: payment state lives in Stripe, but your app needs to know about it. Webhooks are the bridge, but they can be delayed, duplicated, or arrive out of order.

**Solution:** Don't trust webhooks blindly. Use them as triggers to sync the full current state.

---

## Our Implementation

We use the `@convex-dev/stripe` component which handles webhook processing and stores data in Convex tables. This gives us:

- **Automatic webhook verification** - Signature checking built-in
- **Data persistence** - Payments, customers stored in Convex
- **Reactive queries** - UI updates when payment data changes

---

## Key Patterns We Follow

### 1. Create Customers First

Always create a Stripe customer before checkout. Never let checkout create ephemeral customers.

```typescript
// GOOD - customer exists before checkout
const customer = await stripeClient.getOrCreateCustomer(ctx, {
  userId: authUser._id,
  email: authUser.email,
  name: authUser.name ?? undefined,
});

const session = await stripeClient.createCheckoutSession(ctx, {
  customerId: customer.customerId,
  // ...
});
```

### 2. Link Payments to Users

Always pass `userId` in payment metadata so payments can be queried by user.

```typescript
await stripeClient.createCheckoutSession(ctx, {
  mode: "payment",
  paymentIntentMetadata: {
    userId: authUser._id,  // Critical for linking
    tier: "personal",      // App-specific data
  },
  // ...
});
```

### 3. Query by User, Not Event

Don't parse individual webhook payloads. Query the current state.

```typescript
// GOOD - get all payments for user, check status
const payments = await ctx.runQuery(
  components.stripe.public.listPaymentsByUserId,
  { userId: authUser._id }
);
const hasAccess = payments.some(p => p.status === "succeeded");
```

---

## Stripe Dashboard Settings

### Disable Cash App Pay

Settings → Payments → Payment methods → Disable Cash App

> Over 90% of fraudulent cancellations reportedly use Cash App Pay. Disable it.

### Required Webhook Events

For one-time payments, we need:

| Event | Purpose |
|-------|--------|
| `checkout.session.completed` | Checkout finished |
| `payment_intent.succeeded` | Payment confirmed |
| `customer.created` | Customer synced |
| `customer.updated` | Customer info updated |

---

## What We Don't Need (One-Time Payments)

Theo's guide covers subscription complexity we can skip:

- ❌ Subscription lifecycle events (created, updated, deleted)
- ❌ Invoice events
- ❌ Trial management
- ❌ Quantity/seat management
- ❌ Customer portal for subscription management

One-time payments are simpler: checkout → payment succeeds → access granted.

---

## Fraud Prevention

> **Last reviewed:** 2026-02-09

Stripe provides strong defaults. For a small SaaS with one-time payments, don't over-engineer - use the defaults and add rules only when you see fraud patterns.

### What's Already On (Do Nothing)

These are enabled by default when using Stripe Checkout:

| Protection | What It Does | Status |
|------------|--------------|--------|
| **Radar** | ML-based fraud scoring on every transaction | On by default |
| **CVC Check** | Requires card security code | Required in Checkout |
| **3D Secure** | Bank authentication for risky cards | Auto-triggered by Radar |
| **Card Checks** | Validates card number, expiry | Built into Checkout |

**Action:** None required. These work automatically.

### Do Now (Pre-Launch)

Complete these before accepting real payments:

#### 1. Disable Cash App Pay

**Why:** High fraud rate. Most chargebacks come from this payment method.

**How:**
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Settings → Payments → Payment methods
3. Find "Cash App Pay" → Toggle OFF

**Status:** ✅ Already done (2026-02-09)

#### 2. Disable Other Risky Methods

**Why:** Reduce attack surface. Only accept cards.

**How:** Same location as above. Disable:
- Cash App Pay ✅
- Afterpay/Clearpay (buy-now-pay-later fraud)
- Any wallet you don't explicitly want

**Keep enabled:**
- Cards (Visa, Mastercard, Amex)
- Apple Pay / Google Pay (these use tokenized cards, low fraud)
- Link (Stripe's fast checkout, uses saved cards)

### Do Later (When You See Fraud)

Don't add these until you have a reason. Premature rules block legitimate customers.

#### Radar Rules (Custom)

**When:** After you see patterns (e.g., fraud from specific countries, velocity attacks)

**How:**
1. Stripe Dashboard → Radar → Rules
2. Add rules like:
   - Block if `card_country` not in allowed list
   - Block if `risk_level` = "highest"
   - Review if multiple purchases same email in 24h

**Cost:** Radar is free. "Radar for Fraud Teams" ($0.07/transaction) adds more controls.

#### Address Verification (AVS)

**When:** If you see fraud with mismatched addresses

**How:**
1. Radar → Rules → Create rule
2. Block or review if `address_line1_check` = "fail"

**Caution:** AVS doesn't work well internationally. Many legitimate non-US cards fail AVS.

#### 3D Secure for All Transactions

**When:** If fraud persists despite other measures

**How:**
1. Radar → Rules → Create rule
2. "Request 3D Secure" for all transactions

**Trade-off:** Adds friction. Some users drop off at bank authentication step.

### Monitoring

**Check weekly:**
1. Stripe Dashboard → Payments → Filter by "Disputes"
2. Look for patterns: same country, same card type, same time of day

**Red flags:**
- Dispute rate > 0.5% (Stripe will warn you)
- Multiple purchases from same IP/email in short window
- Mismatched billing country and IP country

---

## Reference

- [Theo's Stripe Recommendations](https://github.com/t3dotgg/stripe-recommendations) - Full guide
- [Stripe Radar Docs](https://stripe.com/docs/radar) - Fraud detection
- [Stripe Docs: Webhooks](https://stripe.com/docs/webhooks) - Official docs
- [Convex Stripe Component](https://www.convex.dev/components/stripe) - Our integration