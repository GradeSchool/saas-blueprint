---
last_updated: 2026-02-01
updated_by: vector-projector
change: "Added detailed schema and query reference from GitHub source"
---

# Stripe

Stripe integration for SaaS billing using the official Convex Stripe component.

**Component:** [@convex-dev/stripe](https://www.convex.dev/components/stripe)

**GitHub:** [get-convex/stripe](https://github.com/get-convex/stripe)

---

## Account Access

**Login:** [dashboard.stripe.com](https://dashboard.stripe.com)

**Auth:** Google OAuth with `weheartdotart@gmail.com`

---

## Decision

Stripe direct, not Merchant of Record.

**Rationale:**
- Lower fees (~3.4% vs ~4.4% for MOR)
- No payout hold risk
- Full control

**Trade-off:** Handle tax compliance yourself (or use Stripe Tax +0.5%)

---

## Pricing Model

| Tier | Price | Use Case |
|------|-------|----------|
| One-time download | $2 | Digital product |
| Tier 1 (Personal) | $6/mo | Personal use license |
| Tier 2 (Commercial) | $9/mo | Commercial use license |

---

## Installation

```bash
npm install @convex-dev/stripe
```

**Register in `convex/convex.config.ts`:**

```typescript
import { defineApp } from "convex/server";
import stripe from "@convex-dev/stripe/convex.config.js";

const app = defineApp();
app.use(stripe);

export default app;
```

**Environment Variables** (Convex Dashboard):

| Variable | Source |
|----------|--------|
| `STRIPE_SECRET_KEY` | Stripe Dashboard → API Keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Webhooks → Signing secret |

---

## Webhook Setup

**URL:** `https://<deployment>.convex.site/stripe/webhook`

**Register in `convex/http.ts`:**

```typescript
import { httpRouter } from "convex/server";
import { components } from "./_generated/api";
import { registerRoutes } from "@convex-dev/stripe";

const http = httpRouter();

registerRoutes(http, components.stripe, {
  webhookPath: "/stripe/webhook",
});

export default http;
```

**Required Stripe events:**
- `checkout.session.completed`
- `customer.created`, `customer.updated`
- `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
- `invoice.created`, `invoice.finalized`, `invoice.paid`, `invoice.payment_failed`
- `payment_intent.succeeded`, `payment_intent.payment_failed`

---

## Component Schema

The component creates these tables in its namespace:

### customers

| Field | Type | Description |
|-------|------|-------------|
| `stripeCustomerId` | string | Stripe customer ID |
| `email` | string? | Customer email |
| `name` | string? | Customer name |
| `metadata` | object? | Custom metadata |

### subscriptions

| Field | Type | Description |
|-------|------|-------------|
| `stripeSubscriptionId` | string | Stripe subscription ID |
| `stripeCustomerId` | string | Customer ID |
| `status` | string | active, past_due, canceled, etc. |
| `priceId` | string | Price ID |
| `quantity` | number? | Seat count |
| `currentPeriodEnd` | number | Period end timestamp |
| `cancelAtPeriodEnd` | boolean | Will cancel at period end |
| `cancelAt` | number? | Scheduled cancel time |
| **`userId`** | string? | **Link to app user (authUserId)** |
| `orgId` | string? | Link to organization |
| `metadata` | object? | Custom metadata |

### payments

| Field | Type | Description |
|-------|------|-------------|
| `stripePaymentIntentId` | string | Payment intent ID |
| `stripeCustomerId` | string? | Customer ID |
| `amount` | number | Amount in cents |
| `currency` | string | Currency code |
| `status` | string | Payment status |
| `created` | number | Created timestamp |
| **`userId`** | string? | **Link to app user (authUserId)** |
| `orgId` | string? | Link to organization |
| `metadata` | object? | Custom metadata |

### invoices

| Field | Type | Description |
|-------|------|-------------|
| `stripeInvoiceId` | string | Invoice ID |
| `stripeCustomerId` | string | Customer ID |
| `stripeSubscriptionId` | string? | Subscription ID |
| `status` | string | Invoice status |
| `amountDue` | number | Amount due |
| `amountPaid` | number | Amount paid |
| `created` | number | Created timestamp |
| **`userId`** | string? | **Link to app user (authUserId)** |
| `orgId` | string? | Link to organization |

---

## User Linking

The `userId` field stores `identity.subject` (the auth user ID as a string), NOT a Convex document ID.

**This matches our `users.authUserId` field.**

When creating checkouts, pass the userId in metadata:

```typescript
await stripeClient.createCheckoutSession(ctx, {
  priceId: "price_...",
  customerId: customer.customerId,
  mode: "subscription",
  successUrl: "...",
  cancelUrl: "...",
  subscriptionMetadata: { userId: identity.subject }, // Links subscription to user
});
```

---

## Public Queries

Query subscription/payment data by user:

```typescript
import { components } from "./_generated/api";

// List subscriptions for a user
const subscriptions = await ctx.runQuery(
  components.stripe.public.listSubscriptionsByUserId,
  { userId: authUserId }
);

// List payments for a user
const payments = await ctx.runQuery(
  components.stripe.public.listPaymentsByUserId,
  { userId: authUserId }
);

// List invoices for a user
const invoices = await ctx.runQuery(
  components.stripe.public.listInvoicesByUserId,
  { userId: authUserId }
);
```

**All available queries:**

| Query | Arguments | Returns |
|-------|-----------|--------|
| `getCustomer` | stripeCustomerId | customer or null |
| `getSubscription` | stripeSubscriptionId | subscription or null |
| `getSubscriptionByOrgId` | orgId | subscription or null |
| `listSubscriptions` | stripeCustomerId | subscriptions[] |
| `listSubscriptionsByUserId` | userId | subscriptions[] |
| `getPayment` | stripePaymentIntentId | payment or null |
| `listPayments` | stripeCustomerId | payments[] |
| `listPaymentsByUserId` | userId | payments[] |
| `listPaymentsByOrgId` | orgId | payments[] |
| `listInvoices` | stripeCustomerId | invoices[] |
| `listInvoicesByUserId` | userId | invoices[] |
| `listInvoicesByOrgId` | orgId | invoices[] |

---

## StripeSubscriptions Client

```typescript
import { StripeSubscriptions } from "@convex-dev/stripe";
import { components } from "./_generated/api";

const stripeClient = new StripeSubscriptions(components.stripe, {});
```

**Methods:**

| Method | Description |
|--------|-------------|
| `createCheckoutSession()` | Create Stripe Checkout session |
| `createCustomerPortalSession()` | Generate Customer Portal URL |
| `createCustomer()` | Create new Stripe customer |
| `getOrCreateCustomer()` | Get existing or create new customer |
| `cancelSubscription()` | Cancel a subscription |
| `reactivateSubscription()` | Reactivate canceled subscription |
| `updateSubscriptionQuantity()` | Update seat count |

---

## Subscription Status Values

| Status | Meaning |
|--------|--------|
| `active` | Paid and current |
| `trialing` | In trial period |
| `past_due` | Payment failed, retrying |
| `canceled` | Subscription ended |
| `incomplete` | Initial payment failed |
| `incomplete_expired` | Never completed |
| `unpaid` | Invoice unpaid after retries |
| `paused` | Subscription paused |

---

## Tax Compliance

Options:
1. **Stripe Tax** ($0.005 per transaction) - calculates and collects
2. **Manual** - register in nexus states, file quarterly
3. **Ignore until ~$10K** - common but technically wrong

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Tables empty after checkout | Verify webhook URL and signing secret |
| Customer not linked | Pass `subscriptionMetadata: { userId }` in checkout |
| Auth errors | Ensure `STRIPE_SECRET_KEY` is set in Convex Dashboard |
| Webhook 400/500 | Check Convex logs, verify `STRIPE_WEBHOOK_SECRET` |

---

## Related Docs

- [GitHub: get-convex/stripe](https://github.com/get-convex/stripe)
- [Convex Stripe Component](https://www.convex.dev/components/stripe)
- `/core/06-payments/billing-ux-flow.md` - UX patterns for billing
- `/core/06-payments/multi-app-billing.md` - Multi-app billing strategy