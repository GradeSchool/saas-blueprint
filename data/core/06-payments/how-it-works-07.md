---
last_updated: 2026-02-01
updated_by: vector-projector
change: "Split from billing-how-it-works.md"
---

# Chapter 7: Stripe Tells You (Webhooks)

---

## What Happens

1. Payment succeeded
2. Stripe sends HTTP request to your webhook URL
3. Your webhook handler receives the event
4. Handler stores subscription data in your Convex tables

---

## Timing

Webhooks typically arrive within milliseconds to a few seconds of the payment completing. Stripe sends them immediately - there's no polling interval or delay. However, network conditions can cause delays.

---

## What Should Happen

- Webhook event arrives at `/stripe/webhook`
- Convex Stripe component processes it
- Subscription record created in your database with status "active"
- Customer record created linking Stripe customer to your user

---

## What Can Go Wrong

- Webhook URL misconfigured (wrong domain, typo)
- Webhook secret mismatch (signature verification fails)
- Your server is down (Stripe will retry)
- Handler crashes (Stripe will retry)

---

## Stripe's Retry Behavior

If webhook delivery fails, Stripe retries with exponential backoff - first after a few seconds, then progressively longer intervals (minutes, hours), continuing for up to 3 days.

---

[← Chapter 6: User Pays](how-it-works-06.md) | [Chapter 8: User Returns to Your App →](how-it-works-08.md)
