---
last_updated: 2026-02-09
updated_by: vector-projector
change: "Added Step 8: Disable unwanted payment methods"
tldr: "Step-by-step Stripe product setup: create app account, products, prices, webhooks."
topics: [stripe, products, prices, setup]
---

# Creating Stripe Products

Step-by-step guide for setting up Stripe products using our simplified model: two products per app (Personal/Commercial), each with one price, one-time payments.

> **Canonical source:** Stripe organization structure is defined in [infrastructure.md](../../platform/infrastructure.md#stripe-organization-structure). This file covers the step-by-step setup.

## Prerequisites

- Stripe account with Organization enabled
- Organization name: "We Heart Art" (or your umbrella company)

## Step 1: Create App Account Under Organization

1. Log into Stripe Dashboard
2. Click the account switcher (top-left, shows current account name)
3. Click **"New account"**
4. Name it after your app: **"Vector Projector"**
5. Select your organization (We Heart Art) as the parent
6. Click **Create account**

You now have a dedicated Stripe account for this app. All products, prices, customers, and payments live here.

## Step 2: Configure Account Branding

While in the Vector Projector account:

1. Go to **Settings → Business settings → Branding**
2. Set:
   - **Business name:** Vector Projector
   - **Icon:** Your app icon (square, min 128x128)
   - **Logo:** Your app logo (optional, for receipts)
   - **Brand color:** Your primary color
3. Save changes

This branding appears on Stripe Checkout pages and receipts.

## Step 3: Create Personal Product

1. Go to **Product catalog → Products**
2. Click **"+ Add product"**
3. Fill in:
   - **Name:** Vector Projector Personal
   - **Description:** Personal license - lifetime access for hobbyists and personal use
4. In the **Pricing** section:
   - **Pricing model:** Standard pricing
   - **Price:** $50.00
   - **Currency:** USD
   - **Billing period:** **One time** (NOT recurring)
5. Expand **"Advanced"** under the price
6. Set **Lookup key:** `personal`
7. Click **Save product**

## Step 4: Create Commercial Product

1. Click **"+ Add product"** again
2. Fill in:
   - **Name:** Vector Projector Commercial
   - **Description:** Commercial license - lifetime access with rights to sell prints made with the app
3. In the **Pricing** section:
   - **Pricing model:** Standard pricing
   - **Price:** $100.00
   - **Currency:** USD
   - **Billing period:** **One time**
4. Expand **"Advanced"** under the price
5. Set **Lookup key:** `commercial`
6. Click **Save product**

## Step 5: Verify Product Setup

Your product catalog should now show:

```
Vector Projector Personal
└── $50.00 USD (one time) - lookup_key: personal

Vector Projector Commercial
└── $100.00 USD (one time) - lookup_key: commercial
```

Two products, each with one price. Clean separation.

## Step 6: Get API Keys

1. Go to **Developers → API keys**
2. Copy the **Secret key** (starts with `sk_test_` in test mode, `sk_live_` in live)
3. Add to your Convex environment variables as `STRIPE_SECRET_KEY`

## Step 7: Create Webhook

Webhooks let Stripe notify our system when things happen (payments complete, etc.).

### 7a. Start Webhook Creation

1. Go to **Developers → Webhooks**
2. Click **"Add destination"**
3. Choose **"Your account"**
   - ("Connected accounts" and "v2" are for Stripe Connect - we don't need those)

### 7b. Select Events

Choose these 4 events:

| Event | What it does in our system |
|-------|----------------------------|
| `checkout.session.completed` | User finished checkout. Records the session and links the payment to the customer. This is the main "purchase complete" signal. |
| `payment_intent.succeeded` | Payment went through. Stores the payment record with amount, currency, and metadata (like which user bought what tier). |
| `customer.created` | Safety net. If a customer is created outside our app (e.g., Stripe dashboard), this syncs them to our database. |
| `customer.updated` | Safety net. If customer info changes in Stripe (email, name), this keeps our database in sync. |

### 7c. Choose Destination Type

1. Select **"Webhook endpoint"** (not Amazon EventBridge)
2. Click **Continue**

### 7d. Configure Destination

Fill in:

| Field | Value |
|-------|-------|
| Destination name | `Vector Projector - Development` |
| Endpoint URL | `https://[your-convex-deployment].convex.site/stripe/webhook` |
| Description | `Vector Projector - Development ONLY` |

Example endpoint URL: `https://amiable-yak-159.convex.site/stripe/webhook`

### 7e. Get Webhook Secret

1. Click **Create destination**
2. Copy the **Signing secret** (starts with `whsec_`)
3. Add to Convex environment variables as `STRIPE_WEBHOOK_SECRET`

**Note:** Our app creates customers via API call (which stores them immediately), so the customer events are just safety nets. The checkout and payment events are the essential ones.

## Step 8: Disable Unwanted Payment Methods

Stripe enables several payment methods by default. You may want to disable some.

1. Go to **Settings → Payments → Payment methods**
2. Click **"Enabled"** to see all enabled payment methods
3. Find **Cash App** (or any other method you want to disable)
4. Click the payment method name to open its settings
5. Click the **"Disable"** button at the top

**Review periodically:** Stripe may enable new payment methods over time. Check this list occasionally to ensure only your preferred methods are active.

## Test Mode vs Live Mode

Stripe has two modes per account:

| Mode | API Key Prefix | Use For |
|------|----------------|----------|
| Test | `sk_test_` | Development, testing |
| Live | `sk_live_` | Real payments |

Toggle between modes using the **"Test mode"** switch in the dashboard (top-right).

**Important:** 
- Products/prices must be created in **both modes** - they don't sync automatically
- Webhooks must be created in **both modes** - separate endpoints, separate secrets
- API keys are different per mode

For production, create a second webhook with:
- Destination name: `Vector Projector - Production`
- Description: `Vector Projector - Production`
- Use the production Convex deployment URL

## Repeat for Each App

For future apps (e.g., "Cool App 2"):

1. Create new account under We Heart Art organization
2. Configure branding for that app
3. Create two products (Personal and Commercial) with one price each
4. Set up API keys and webhooks

Each app is completely isolated - separate customers, payments, and branding.

---

## Quick Reference

| Item | Value |
|------|-------|
| Organization | We Heart Art |
| Account | Vector Projector |
| Product 1 | Vector Projector Personal |
| Product 1 Price | $50 one-time, lookup_key: `personal` |
| Product 2 | Vector Projector Commercial |
| Product 2 Price | $100 one-time, lookup_key: `commercial` |
| Webhook Events | `checkout.session.completed`, `payment_intent.succeeded`, `customer.created`, `customer.updated` |

## Code Integration

The sync pulls all products/prices from the account. To find the right price:

```typescript
const price = catalog.prices.find(p => p.lookupKey === tier);
```

Where `tier` is `"personal"` or `"commercial"`.
