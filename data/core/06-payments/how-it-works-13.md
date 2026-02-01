---
last_updated: 2026-02-01
updated_by: vector-projector
change: "Split from billing-how-it-works.md"
---

# Chapter 13: User Resubscribes

User's subscription ended (failed payments or cancellation) and they want to come back.

---

## What Happens

Same as Chapters 5-8:

1. User clicks Subscribe
2. Goes to Stripe Checkout
3. Pays
4. Webhook arrives
5. User sees "active"

---

## Notes

- User goes through the full checkout flow again
- They may or may not use the same card
- New subscription is created (not reactivating the old one)

---

[← Chapter 12: All Retries Fail](how-it-works-12.md) | [Chapter 14: User Cancels →](how-it-works-14.md)
