---
last_updated: 2026-02-01
updated_by: vector-projector
change: "Added embedded shell testing method, marked fully tested"
status: tested
---

# Stripe Setup

Step-by-step guide to configure Stripe for a new app.

**API Version:** 2025-12-15.clover (as of Feb 2026)

---

## Prerequisites

- App deployed to Convex (you need the `.convex.site` URL)
- `@convex-dev/stripe` component installed and registered
- Access to weheart.art Stripe account

---

## Important: Platform Architecture

**weheart.art is a platform.** All apps share a single Stripe account.

| Shared | Per-App |
|--------|--------|
| Stripe account | Webhook endpoint |
| API keys (secret key) | Webhook signing secret |
| Customer records | Products/Prices |
| Payment history | Convex environment vars |

**Naming conventions are critical.** With multiple apps in one Stripe account, use clear prefixes:
- Products: `[app-name] Subscription - Personal`
- Prices: Include app context in metadata
- Webhooks: Name by app for easy identification

---

## Step 1: Login to Stripe

1. Go to [dashboard.stripe.com](https://dashboard.stripe.com)
2. Login with Google OAuth using **`weheartdotart@gmail.com`**
3. Ensure you're in the correct mode:
   - **Test mode** / **Sandbox** for development
   - **Live mode** for production

**Note:** Test and Live modes have separate API keys, webhooks, and products.

---

## Step 2: Get API Secret Key

1. Click **"Developers"** in the bottom-left corner
2. Click **"API keys"**
3. Find **"Secret key"** (starts with `sk_test_` or `sk_live_`)
4. Click to reveal and copy

**Save for later:** This goes in Convex as `STRIPE_SECRET_KEY`

**Security:** Never commit this key to git. Only store in:
- Convex Dashboard → Environment Variables
- Local `.env.local` (gitignored) for reference

---

## Step 3: Create Webhook - Start

**Each app needs its own webhook** because each has a unique Convex deployment URL.

1. In Stripe Dashboard, go to **Developers → Webhooks**
2. Click **"Add destination"**

---

## Step 4: Select Events

You'll see the "Select events" screen:

1. **Events from:** Select **"Your account"**
   - NOT "Connected and V2 accounts" (that's for Stripe Connect marketplaces)
   - We're a single merchant with multiple products

2. **API version:** Leave as default (`2025-12-15.clover` or current)

3. **Events:** Do NOT select "All events" - too much unnecessary traffic
   
   Use the search box to find and select these **12 events**:

   | Category | Events to Select |
   |----------|------------------|
   | Checkout | `checkout.session.completed` |
   | Customer | `customer.created`, `customer.updated` |
   | Subscription | `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted` |
   | Invoice | `invoice.created`, `invoice.finalized`, `invoice.paid`, `invoice.payment_failed` |
   | Payment | `payment_intent.succeeded`, `payment_intent.payment_failed` |

   **Tip:** Search for partial names like `checkout.session`, `customer.subscription`, etc.

4. Verify "Selected events" tab shows **(12)** 

5. Click **"Continue"**

---

## Step 5: Choose Destination Type

You'll see a choice:
- **Webhook endpoint** ← Select this one
- Amazon EventBridge

Select **"Webhook endpoint"** and continue.

---

## Step 6: Configure Webhook Endpoint

You'll see three fields:

### Destination name
```
Vector Projector - Development
```
(Clear name for multi-app organization)

### Endpoint URL

**IMPORTANT: Use `.convex.site` NOT `.convex.cloud`**

| URL Type | Domain | Used For |
|----------|--------|----------|
| `VITE_CONVEX_URL` | `.convex.cloud` | Database queries, mutations |
| **HTTP endpoints** | **`.convex.site`** | **Webhooks, file routes** |

Your webhook URL format:
```
https://<deployment-name>.convex.site/stripe/webhook
```

**To find your deployment name:**
1. Check your `.env.local` for `VITE_CONVEX_URL`
2. It looks like `https://something-something-123.convex.cloud`
3. Take that subdomain, replace `.convex.cloud` with `.convex.site`
4. Add `/stripe/webhook` at the end

**Example:**
- `VITE_CONVEX_URL` = `https://cool-fox-456.convex.cloud`
- Webhook URL = `https://cool-fox-456.convex.site/stripe/webhook`

### Description (optional)
```
Webhook for Vector Projector development environment
```

Click **"Create destination"**

---

## Step 7: Get Webhook Signing Secret

1. After creating the endpoint, you should see the webhook details
2. Find **"Signing secret"** (starts with `whsec_`)
3. Click to reveal and copy

**Save for later:** This goes in Convex as `STRIPE_WEBHOOK_SECRET`

**Note:** Each webhook endpoint has its own signing secret. This is per-app.

---

## Step 8: Add Environment Variables to Convex

1. Go to [Convex Dashboard](https://dashboard.convex.dev)
2. Select your project
3. Go to **Settings → Environment Variables**
4. Add these variables:

| Variable | Value | Notes |
|----------|-------|-------|
| `STRIPE_SECRET_KEY` | `sk_test_...` or `sk_live_...` | Shared across apps (same Stripe account) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | **Unique per app** (each webhook endpoint) |

---

## Step 9: Install and Register the Component

### Install the package

```bash
npm install @convex-dev/stripe
```

### Register in `convex/convex.config.ts`

**Note:** The `.js` extension is required in the import path.

```typescript
import { defineApp } from "convex/server";
import stripe from "@convex-dev/stripe/convex.config.js";

const app = defineApp();
app.use(stripe);
export default app;
```

### Add webhook routes in `convex/http.ts`

```typescript
import { httpRouter } from "convex/server";
import { registerRoutes as registerStripeRoutes } from "@convex-dev/stripe";
import { components } from "./_generated/api";

const http = httpRouter();

// ... other routes ...

// Stripe webhook handler
registerStripeRoutes(http, components.stripe, {
  webhookPath: "/stripe/webhook",
});

export default http;
```

---

## Step 10: Test the Webhook

Stripe's new Workbench UI has an **embedded shell** at the bottom of the dashboard.

1. Go to your webhook in Stripe Dashboard (Developers → Webhooks → click your endpoint)
2. Look for the shell prompt at the bottom: `$ Enter a shell command...`
3. Type this command and press Enter:
   ```
   stripe trigger customer.created
   ```
4. You should see a JSON response with the created customer
5. Verify delivery:
   - **Stripe:** Click "Event deliveries" tab - should show 200 status
   - **Convex:** Check Logs in Convex Dashboard - should show `POST /stripe/webhook`

**Other test commands:**
```
stripe trigger checkout.session.completed
stripe trigger customer.subscription.created
stripe trigger invoice.paid
```

---

## Step 11: Create Products (Per-App)

**Naming convention:** Prefix with app name for clarity.

1. Go to **Products** in Stripe Dashboard
2. Click **"Add product"**
3. Create products for your app:

**Example for Vector Projector:**

| Product Name | Price | Billing |
|--------------|-------|--------|
| `Vector Projector - Personal` | $6/month | Recurring |
| `Vector Projector - Commercial` | $9/month | Recurring |
| `Vector Projector - One-time Export` | $2 | One-time |

4. Save the **Price IDs** (start with `price_`) - you'll need these in your app code

---

## Test vs Live Mode Checklist

When moving from test to production:

| Item | Test Mode | Live Mode |
|------|-----------|----------|
| API Secret Key | `sk_test_...` | `sk_live_...` |
| Webhook endpoint | Create new for live | Different URL possible |
| Webhook secret | `whsec_...` (test) | `whsec_...` (live) - different! |
| Products/Prices | Create in test | Recreate in live |
| Environment vars | Update in Convex | Use production deployment |

**Important:** Test and Live are completely separate. You need to:
1. Create products again in Live mode
2. Create webhook endpoint again in Live mode
3. Update all environment variables for production

---

## Multi-App Organization Tips

### Webhook Naming

Name webhooks clearly:
- `Vector Projector - Development`
- `Vector Projector - Production`
- `Tiler Styler - Development`
- etc.

### Product Organization

Use consistent naming:
- `[App Name] - [Tier Name]`
- Add app identifier in product metadata

### Customer Notes

Customers are shared across apps. A user who signs up for Vector Projector and later uses Tiler Styler will be the same Stripe customer. This is good for:
- Single payment method management
- Unified billing history
- Potential bundle discounts

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Webhook returns 404 | Check URL uses `.convex.site` and path matches `webhookPath` in code |
| Webhook returns 400 | Wrong signing secret - verify `STRIPE_WEBHOOK_SECRET` |
| Webhook returns 500 | Check Convex logs for error details |
| No data after checkout | Verify all 12 required events are selected |
| "Invalid API key" | Check `STRIPE_SECRET_KEY` in Convex env vars |
| Import error | Use `.js` extension: `@convex-dev/stripe/convex.config.js` |

---

## Related Docs

- `/core/06-payments/stripe.md` - Component reference
- `/core/06-payments/billing-ux-flow.md` - UX patterns
- `/core/05-storage/bunny-setup.md` - Similar setup pattern for storage