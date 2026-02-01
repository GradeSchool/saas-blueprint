---
last_updated: 2026-02-01
updated_by: vector-projector
change: "Split from billing-how-it-works.md"
---

# Chapter 14: User Cancels

User voluntarily cancels their subscription.

---

## What Happens

1. User clicks "Manage Subscription" in your app
2. Redirect to Stripe Customer Portal
3. User clicks "Cancel" on Stripe's page
4. Stripe marks subscription `cancelAtPeriodEnd: true`
5. Webhook sent to you
6. User still has access until period ends
7. Period ends, Stripe sends "subscription deleted" webhook
8. User loses access (back to Discovery Mode)

---

## What Should Happen

- User sees "Canceling at end of period" status
- After period ends, sees "Resubscribe" prompt

---

## What Can Go Wrong

- User expects immediate cancellation/refund (Stripe portal handles refund requests)
- User forgets they canceled, wonders why access stopped

---

## Notes

- Cancellation is not immediate - user keeps access until their paid period ends
- This is standard SaaS behavior
- Stripe handles refund requests through the Customer Portal

---

[← Chapter 13: User Resubscribes](how-it-works-13.md) | [Back to Overview →](how-it-works-01.md)
