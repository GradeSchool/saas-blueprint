---
last_updated: 2026-02-01
updated_by: vector-projector
change: "Split from billing-how-it-works.md"
---

# Chapter 11: User Fixes Payment

User sees the warning and updates their payment method.

---

## What Happens

1. User sees warning in your app
2. User clicks "Update Payment Method"
3. Your app redirects to Stripe Customer Portal
4. User updates their card on Stripe's page
5. Stripe retries the failed payment
6. Payment succeeds
7. Stripe sends webhook: status back to "active"
8. User's app updates via reactive query

---

## What Should Happen

- Warning disappears
- User back to normal

---

## What Can Go Wrong

- New card also fails
- User doesn't complete the portal flow
- User can't figure out the portal

---

[← Chapter 10: Payment Fails](how-it-works-10.md) | [Chapter 12: All Retries Fail →](how-it-works-12.md)
