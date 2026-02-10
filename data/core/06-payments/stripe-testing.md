---
last_updated: 2026-02-02
updated_by: vector-projector
change: "Initial creation - Stripe testing guide"
tldr: "Testing Stripe in dev: test mode, test cards, webhook simulation."
topics: [stripe, testing, dev, webhooks]
---

# Stripe Testing

How to test Stripe integration in development using test mode.

## Test Mode vs Live Mode

Stripe has two modes:
- **Test mode**: Fake transactions, no real money moves
- **Live mode**: Real transactions, real money

Your API keys determine which mode you're in:
- Keys starting with `sk_test_` and `pk_test_` = test mode
- Keys starting with `sk_live_` and `pk_live_` = live mode

**Always use test keys in development.** The Convex dashboard should have test keys configured.

## Test Credit Card Numbers

### Successful Payments

| Card Number | Description |
|-------------|-------------|
| `4242 4242 4242 4242` | Visa - always succeeds |
| `5555 5555 5555 4444` | Mastercard - always succeeds |
| `3782 822463 10005` | Amex - always succeeds |

For all successful cards:
- **Expiry**: Any future date (e.g., 12/34)
- **CVC**: Any 3 digits (4 for Amex)
- **ZIP**: Any valid format

### Declined Payments

| Card Number | Decline Reason |
|-------------|----------------|
| `4000 0000 0000 0002` | Card declined (generic) |
| `4000 0000 0000 9995` | Insufficient funds |
| `4000 0000 0000 9987` | Lost card |
| `4000 0000 0000 9979` | Stolen card |
| `4000 0000 0000 0069` | Expired card |
| `4000 0000 0000 0127` | Incorrect CVC |
| `4000 0000 0000 0119` | Processing error |

### 3D Secure (Authentication Required)

| Card Number | Behavior |
|-------------|----------|
| `4000 0025 0000 3155` | Requires authentication, succeeds |
| `4000 0082 6000 3178` | Requires authentication, fails |
| `4000 0000 0000 3220` | 3DS2 required, succeeds |

### Subscription-Specific

| Card Number | Behavior |
|-------------|----------|
| `4000 0000 0000 0341` | Attaches to customer, but first charge fails |
| `4000 0000 0000 3055` | 3DS required on first charge only |

## Testing Webhooks Locally

Stripe webhooks need to reach your Convex backend. For the `@convex-dev/stripe` component, webhooks are automatically handled via Convex HTTP routes.

**In test mode**: Webhooks fire immediately after test transactions.

**Verify webhook delivery**: Check Stripe Dashboard > Developers > Webhooks > Recent deliveries

## Testing Checklist

### New Subscription Flow

1. [ ] Go to Pricing page
2. [ ] Click Subscribe on a tier
3. [ ] Select billing period (monthly/yearly)
4. [ ] Complete checkout with `4242 4242 4242 4242`
5. [ ] Verify redirect back to app
6. [ ] Check subscription status appears on User page
7. [ ] Verify correct tier and renewal date

### Failed Payment Flow

1. [ ] Start checkout
2. [ ] Use `4000 0000 0000 0002` (decline)
3. [ ] Verify error message in Stripe checkout
4. [ ] Verify no subscription created in app

### Cancel Subscription Flow

1. [ ] With active subscription, go to User page
2. [ ] Click "Manage Subscription"
3. [ ] Cancel in Stripe Customer Portal
4. [ ] Verify app shows "Cancels on [date]" status

### Resubscribe Flow

1. [ ] After cancellation, go to Pricing
2. [ ] Subscribe again
3. [ ] Verify new subscription works

## Stripe Dashboard Locations

| Task | Location |
|------|----------|
| View test transactions | Payments (toggle "Test mode" on) |
| View test customers | Customers |
| View test subscriptions | Subscriptions |
| Check webhook deliveries | Developers > Webhooks |
| View products/prices | Products |
| API keys | Developers > API keys |

## Common Issues

### "No such price" error
- Price ID in catalog doesn't match Stripe
- Run admin sync to refresh catalog

### Webhook not received
- Check Stripe webhook endpoint is correct
- Verify webhook signing secret in env vars
- Check Stripe Dashboard for delivery failures

### Subscription not showing after checkout
- Webhook may be delayed (rare in test mode)
- Check Convex logs for webhook errors
- Verify `userId` metadata is set correctly on subscription

## Resources

- [Stripe Testing Docs](https://stripe.com/docs/testing)
- [Test Card Numbers](https://stripe.com/docs/testing#cards)
- [Webhook Testing](https://stripe.com/docs/webhooks/test)
