---
last_updated: 2026-02-01
updated_by: vector-projector
change: "Split from billing-how-it-works.md"
---

# Chapter 6: User Pays

---

## What Happens

1. User is on Stripe's page (not yours)
2. User enters credit card info
3. User clicks "Pay" or "Subscribe"
4. Stripe processes the payment
5. Stripe stores the card for future billing

---

## What Should Happen

- Payment succeeds
- Stripe creates a subscription record
- Stripe creates a customer record (if new)

---

## What Can Go Wrong

- Card declined (user sees error on Stripe's page)
- User abandons checkout (closes tab, never pays)
- Fraud detection blocks payment

---

## Important

**You have zero code running during this step.** It's all Stripe. Your app is just waiting.

---

[← Chapter 5: User Clicks Subscribe](how-it-works-05.md) | [Chapter 7: Stripe Tells You →](how-it-works-07.md)
