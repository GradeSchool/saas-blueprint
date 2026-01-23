---
last_updated: 2026-01-23
updated_by: saas-blueprint
change: "Initial multi-app billing strategy"
---

# Multi-App Billing Strategy

Single LLC + single Stripe account serving multiple SaaS apps.

## Why This Approach

- One bank account, one Stripe dashboard
- Simplified bookkeeping and taxes
- Each SaaS app = 1-3 Stripe products
- Easy to manage at small scale (5-10 apps)

## Stripe Branding Layers

| Layer | Customizable Per App? | Notes |
|-------|----------------------|-------|
| Statement descriptor | Partial | Shows `HOLDINGCO* APPNAME` via suffix |
| Invoices & receipts | Yes | Full branding (name, logo, support email) |
| Checkout sessions | Yes | Custom business_name per session |
| Customer portal | No | Account-wide branding only |

## Statement Descriptor

The credit card statement shows:
```
HOLDINGCO* APPNAME
```

- Prefix is tied to your Stripe account (can't hide it)
- Use `statement_descriptor_suffix` per charge/subscription
- Most customers look at invoices, not raw card statements

## Invoice Branding

Stripe invoices can be fully customized:
- Business name (the SaaS app name)
- Logo
- Support email
- Custom footer

This is what customers actually look at.

## Implementation

```typescript
// When creating subscription
const subscription = await stripe.subscriptions.create({
  customer: customerId,
  items: [{ price: priceId }],
  // This appends to your account's statement descriptor
  statement_descriptor_suffix: 'APPNAME',
})

// When creating checkout session
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  line_items: [{ price: priceId, quantity: 1 }],
  success_url: '...',
  cancel_url: '...',
  // Custom branding for this checkout
  custom_text: {
    submit: { message: 'Your AppName subscription' },
  },
})
```

## When to Consider Stripe Connect

Upgrade to Stripe Connect (separate connected accounts per SaaS) when:

- An app grows significantly and needs full brand separation
- You want to sell an app independently
- Legal/liability separation becomes important
- You need completely separate statement descriptors

## Connect Architecture (Future)

If needed later:
- Your LLC becomes the "platform"
- Each SaaS app is a "connected account"
- Full branding separation
- More setup overhead
- Each app can be spun off cleanly

## Current Setup

```
Your LLC (Stripe Account)
├── Product: App1 Personal ($6/mo)
├── Product: App1 Commercial ($9/mo)
├── Product: App2 Personal ($6/mo)
├── Product: App2 Commercial ($9/mo)
└── ... etc
```

## Related

- [stripe.md](stripe.md) - Core Stripe setup
