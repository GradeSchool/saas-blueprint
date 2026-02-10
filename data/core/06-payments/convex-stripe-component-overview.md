---
last_updated: 2026-02-09
updated_by: vector-projector
change: "Cleaned up for one-time payments model, updated title and examples"
tldr: "Stripe integration using @convex-dev/stripe component. Handles checkout, webhooks, and payment tracking."
topics: [stripe, payments, billing, convex]
---

# Stripe Component Overview

We use the official Convex Stripe component for payment integration. It handles Stripe webhooks, stores payment records in Convex tables, and provides utilities for checkout sessions.

**Component:** [@convex-dev/stripe](https://www.convex.dev/components/stripe)

**GitHub:** [get-convex/stripe](https://github.com/get-convex/stripe)

---

## Why This Component

- **Webhook handling** - Automatic webhook verification and event processing
- **Data persistence** - Stores customers, payments, invoices in Convex tables
- **User linking** - Associates payments with your app's users via `userId` field
- **Checkout sessions** - Easy creation of Stripe Checkout URLs

---

## Account Access

**Login:** [dashboard.stripe.com](https://dashboard.stripe.com)

**Auth:** Google OAuth with `weheartdotart@gmail.com`

**Structure:** One account per app under "We Heart Art" organization. See [infrastructure.md](../../platform/infrastructure.md#stripe-organization-structure) for details.

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

| Variable                | Source                                       |
| ----------------------- | -------------------------------------------- |
| `STRIPE_SECRET_KEY`     | Stripe Dashboard → API Keys                  |
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

**Required events for one-time payments:**

| Event | Purpose |
|-------|--------|
| `checkout.session.completed` | Checkout finished, triggers fulfillment |
| `payment_intent.succeeded` | Payment confirmed, access granted |
| `customer.created` | New customer record synced |
| `customer.updated` | Customer info updated |

---

## Component Tables

The component creates tables in its own namespace. Key tables for one-time payments:

### customers

| Field              | Type    | Description        |
| ------------------ | ------- | ------------------ |
| `stripeCustomerId` | string  | Stripe customer ID |
| `email`            | string? | Customer email     |
| `name`             | string? | Customer name      |
| `metadata`         | object? | Custom metadata    |

### payments

| Field                   | Type    | Description                       |
| ----------------------- | ------- | --------------------------------- |
| `stripePaymentIntentId` | string  | Payment intent ID                 |
| `stripeCustomerId`      | string? | Customer ID                       |
| `amount`                | number  | Amount in cents                   |
| `currency`              | string  | Currency code                     |
| `status`                | string  | Payment status (succeeded, etc.)  |
| `created`               | number  | Created timestamp                 |
| **`userId`**            | string? | **Link to app user (authUserId)** |
| `metadata`              | object? | Custom metadata (tier, etc.)      |

---

## User Linking

The `userId` field stores the auth user ID as a string (from `identity.subject`), NOT a Convex document ID.

**This matches our `users.authUserId` field.**

When creating checkouts, pass userId in metadata:

```typescript
await stripeClient.createCheckoutSession(ctx, {
  priceId: "price_...",
  customerId: customer.customerId,
  mode: "payment",  // One-time payment
  successUrl: "...",
  cancelUrl: "...",
  paymentIntentMetadata: { 
    userId: authUser._id,  // Links payment to user
    tier: "personal",      // Custom data for your app
  },
});
```

---

## Querying Payment Data

```typescript
import { components } from "./_generated/api";

// List payments for a user
const payments = await ctx.runQuery(
  components.stripe.public.listPaymentsByUserId, 
  { userId: authUserId }
);

// Check for successful payment
const hasAccess = payments.some(p => p.status === "succeeded");
```

**Key queries:**

| Query                    | Arguments             | Returns          |
| ------------------------ | --------------------- | ---------------- |
| `getCustomer`            | stripeCustomerId      | customer or null |
| `getPayment`             | stripePaymentIntentId | payment or null  |
| `listPayments`           | stripeCustomerId      | payments[]       |
| `listPaymentsByUserId`   | userId                | payments[]       |

---

## Client Usage

```typescript
import { StripeSubscriptions } from "@convex-dev/stripe";
import { components } from "./_generated/api";

const stripeClient = new StripeSubscriptions(components.stripe, {});
```

> Note: The class is named `StripeSubscriptions` but handles all payment types.

**Key methods:**

| Method                    | Description                         |
| ------------------------- | ----------------------------------- |
| `createCheckoutSession()` | Create Stripe Checkout session      |
| `createCustomer()`        | Create new Stripe customer          |
| `getOrCreateCustomer()`   | Get existing or create new customer |

---

## Troubleshooting

| Issue                       | Solution                                              |
| --------------------------- | ----------------------------------------------------- |
| Tables empty after checkout | Verify webhook URL and signing secret                 |
| Payment not linked to user  | Pass `paymentIntentMetadata: { userId }` in checkout  |
| Auth errors                 | Ensure `STRIPE_SECRET_KEY` is set in Convex Dashboard |
| Webhook 400/500             | Check Convex logs, verify `STRIPE_WEBHOOK_SECRET`     |

---

## Related Docs

- [GitHub: get-convex/stripe](https://github.com/get-convex/stripe)
- [Convex Stripe Component](https://www.convex.dev/components/stripe)