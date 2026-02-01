---
last_updated: 2026-02-01
updated_by: vector-projector
change: "Split from billing-how-it-works.md"
---

# Chapter 10: Payment Fails

Card expires, gets declined, or has insufficient funds.

---

## What Happens

1. Billing day arrives
2. Stripe tries to charge the card
3. Card is expired / declined / insufficient funds
4. Charge fails

---

## What Stripe Does Automatically (Not Your Code)

- Marks subscription as "past_due"
- Sends email to customer: "Update your payment method"
- Sends webhook to you: "invoice.payment_failed"
- Waits a few days
- Tries charging again (Smart Retries)
- Repeats 3-4 times over ~3 weeks

---

## What Should Happen in Your App

- Webhook arrives, subscription status updated to "past_due"
- User's reactive query auto-updates (live subscription, not polling)
- UI shows warning: "Payment failed, please update"
- User still has access (grace period)

---

## What Can Go Wrong

- User doesn't see the warning (doesn't open app)
- User ignores the warning
- User's email from Stripe goes to spam

---

[← Chapter 9: Life is Good](how-it-works-09.md) | [Chapter 11: User Fixes Payment →](how-it-works-11.md)
