---
last_updated: 2026-02-01
updated_by: vector-projector
change: "Split from billing-how-it-works.md"
---

# Chapter 9: Life is Good (Recurring Billing)

The happy path. User is subscribed, payments happen automatically.

---

## What Happens

1. User uses your app happily
2. 30 days pass (or whatever billing cycle)
3. Stripe's scheduler automatically charges the card
4. Stripe sends webhook: "invoice.paid"
5. Your database stays up to date

---

## What Should Happen

- User never notices
- Payments happen silently in background
- Subscription stays "active"

---

## What Can Go Wrong

Nothing yet. This is the happy path.

---

## Important

**Your code does nothing here.** Stripe handles recurring billing automatically. You don't trigger monthly charges - Stripe's scheduler does.

---

[← Chapter 8: User Returns](how-it-works-08.md) | [Chapter 10: Payment Fails →](how-it-works-10.md)
