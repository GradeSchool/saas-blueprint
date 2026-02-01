---
last_updated: 2026-02-01
updated_by: vector-projector
change: "Split from billing-how-it-works.md"
---

# Chapter 12: All Retries Fail

Stripe tried multiple times. User never fixed their payment method.

---

## What Happens

1. Stripe tried multiple times over weeks
2. All attempts failed
3. Stripe gives up
4. Stripe marks subscription "unpaid" or "canceled"
5. Sends final webhook

---

## What Should Happen in Your App

- Subscription status becomes "unpaid" or "canceled"
- User's access is restricted (back to Discovery Mode)
- UI shows: "Subscribe to continue" or "Reactivate"

---

## What Can Go Wrong

- User is upset they lost access
- User blames you (even though their card was the problem)
- User churns (never comes back)

---

[← Chapter 11: User Fixes Payment](how-it-works-11.md) | [Chapter 13: User Resubscribes →](how-it-works-13.md)
