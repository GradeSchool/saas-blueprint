---
last_updated: 2026-01-28
updated_by: vector-projector
change: "Added account access info"
---

# Stripe

Stripe integration for SaaS billing. Not MOR (Polar/Dodo).

## Account Access

**Login:** [dashboard.stripe.com](https://dashboard.stripe.com)

**Auth:** Google OAuth with `weheartdotart@gmail.com`

Make sure you're logged into Google with this account before accessing Stripe.

## Decision

Stripe direct, not Merchant of Record.

**Rationale**:
- Lower fees (~3.4% vs ~4.4% for MOR)
- No payout hold risk
- Established company (14+ years)
- Full control

**Trade-off**: Handle tax compliance yourself (or use Stripe Tax +0.5%)

## Pricing Model

| Tier | Price | Use Case |
|------|-------|----------|
| One-time download | $2 | Digital product |
| Tier 1 (Personal) | $6/mo | Personal use license |
| Tier 2 (Commercial) | $9/mo | Commercial use license |

## Fee Comparison

At $2 transaction:
- MOR (4% + 40¢): ~24% total fees
- Stripe (2.9% + 30¢): ~18% total fees

Low-price items get hurt by fixed per-transaction fees.

## Stripe Products

- **Stripe Checkout**: One-time purchases
- **Stripe Billing**: Subscriptions
- **Stripe Tax**: Automatic tax calculation (+0.5%)
- **Customer Portal**: Self-service subscription management

## Convex Integration

TODO: Add Stripe + Convex webhook pattern

## Tax Compliance

Options:
1. **Stripe Tax** ($0.005 per transaction) - calculates and collects
2. **Manual** - register in nexus states, file quarterly
3. **Ignore until ~$10K** - common but technically wrong

## Notes

- License terms (personal vs commercial) are in ToS, not enforced by payment system
- Consider bundling low-price items ($5 minimum or credit packs)
- Test with Stripe test mode before going live