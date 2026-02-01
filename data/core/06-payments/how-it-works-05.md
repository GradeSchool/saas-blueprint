---
last_updated: 2026-02-01
updated_by: vector-projector
change: "Split from billing-how-it-works.md"
---

# Chapter 5: User Clicks Subscribe

---

## What Happens

1. User sees subscription options (Personal vs Commercial, Monthly vs Yearly)
2. User picks a tier and period
3. Your app calls Stripe API: "Create a checkout session"
   ```typescript
   // User picked Commercial Monthly
   const priceId = process.env.VP_STRIPE_PRICE_COMMERCIAL_MONTHLY;
   
   const session = await stripeClient.createCheckoutSession(ctx, {
     priceId,
     customerId: customer.customerId,
     mode: "subscription",
     successUrl: "https://yourapp.com/success?session_id={CHECKOUT_SESSION_ID}",
     cancelUrl: "https://yourapp.com/",
   });
   ```
4. Stripe returns a URL to their hosted checkout page
5. Your app redirects the user to that URL
6. User leaves your site temporarily

**Note:** Include `{CHECKOUT_SESSION_ID}` in the success URL. Stripe replaces this with the actual session ID.

---

## What Should Happen

- User lands on Stripe's checkout page
- Page shows the product name, price, payment form

---

## What Can Go Wrong

- Stripe API call fails (network, bad API key)
- Invalid Price ID (typo, archived, wrong mode)
- Redirect fails (rare)
- User gets confused they're on a different site (normal, it's Stripe's page)

---

[← Chapter 4: Human Signs Up](how-it-works-04.md) | [Chapter 6: User Pays →](how-it-works-06.md)
