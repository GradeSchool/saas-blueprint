---
last_updated: 2026-02-01
updated_by: vector-projector
change: "Split from billing-how-it-works.md"
---

# Chapter 2: Admin Creates Products in Stripe

**This must happen first. Nothing else works until you do this.**

Stripe has two concepts:
- **Product** = What you're selling (e.g., "Vector Projector Personal")
- **Price** = How much it costs (e.g., "$6/month" or "$60/year")

One Product can have multiple Prices (monthly vs yearly).

---

## What Happens

1. Admin logs into Stripe Dashboard (dashboard.stripe.com)
2. Navigate to: **Product catalog → Products → Add product**
3. Create Products for each tier:
   - "Vector Projector Personal"
   - "Vector Projector Commercial"
4. Add Prices to each Product:
   - Personal: $6/month, $60/year
   - Commercial: $9/month, $90/year
5. Stripe generates a **Price ID** for each: `price_1ABC123xyz...`
6. **Copy each Price ID.** You need them for the next step.

---

## What Should Happen

- 2 Products exist in Stripe (Personal, Commercial)
- 4 Prices exist (2 per product: monthly + yearly)
- All set to "Active"
- You have 4 Price IDs copied

---

## What Can Go Wrong

- Product created but no Price added (can't sell it)
- Price set to "Inactive" (checkout will fail)
- Wrong billing period (monthly vs yearly mixup)
- Test mode vs Live mode confusion (they're completely separate)

---

## Test Mode vs Live Mode

Stripe has two completely separate environments:

| Mode | Dashboard toggle | Real money? |
|------|------------------|-------------|
| Test | "Test mode" ON (top right) | No |
| Live | "Test mode" OFF | Yes |

**Important:**
- Products/Prices created in Test mode do NOT exist in Live mode
- You must create them separately in each mode
- Use Test mode for development, Live mode for production
- You'll have different Price IDs for each mode

---

## Recommended Stripe Settings

From [Theo's guide](https://github.com/t3dotgg/stripe-recommendations):

1. **Enable "Limit customers to one subscription"** - Prevents double-checkout race conditions
2. **Disable Cash App Pay** - Over 90% of chargebacks use this payment method

---

[← Chapter 1: Overview](how-it-works-01.md) | [Chapter 3: Admin Stores Price IDs →](how-it-works-03.md)
