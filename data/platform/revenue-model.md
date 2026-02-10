---
last_updated: 2026-02-09
updated_by: vector-projector
change: "Fixed Our Mental Model bullet structure"
tldr: "Makerworld crowdfunding primary, Stripe one-time payments as fallback. No subscriptions."
topics: [platform, revenue, billing, makerworld, stripe]
---

# Revenue Model

## The Big Picture

No monthly subscriptions. Ever. Users pay once, get lifetime access. In this model, we lean 1000% into Makerworld. All revenue comes through Makerworld crowdfunding. We set up the project there, run the campaign, and once the campaign timeline ends, late pledge mode kicks in. Folks can still sign up — potentially forever.

If- for any reason- the Makerworld Crowdfunding platform becomes a problem, we fall back on using Stripe to monetize. Scenarios include Makerworld rejects our campaign, raises fees, loses community support, etc. In this scenario- the platform supports one time purchases of two license tiers (Personal and Commercial) for all apps.

### Our Mental Model

- **Makerworld Crowdfunding is the primary marketing→revenue driver.**
  - Lean into Makerworld.
- **SaaS has a limited lifespan — AI is coming.**
  - Cash grab up front.
- **Subscription fatigue and pricing complexity is a real concern.**
  - One time purchase only.

**Two ways to pay:**

1. **Makerworld Crowdfunding** (primary) - backers get access codes
2. **Stripe One-Time Payment** (fallback) - if Makerworld becomes non-viable

---

## Stripe Organization Structure

- **Organization:** We Heart Art (the company umbrella)
- **Accounts:** One per app (Vector Projector, Future App 1, etc.)

Each app has its own Stripe account with its own branding. When a user checks out for Vector Projector, they see "Vector Projector" everywhere, not "We Heart Art."

---

## Tiers

Two tiers per app:

- **Personal** - for hobbyists, personal use
- **Commercial** - for businesses, commercial use

Example: Vector Projector Personal ($50), Vector Projector Commercial ($100)

**Important:** Tiers are about **licensing**, not app features. The app works exactly the same for everyone. Commercial buyers have legal permission to sell prints made with the app. Personal buyers do not. This is an honor system - standard in the 3D printing community. We cannot enforce it technically.

---

## Lifetime Access

When someone pays, they get access forever. No expiration date. No renewal.

**Example:** Sarah buys Vector Projector Personal for $50 in 2026. In 2035, she still has access. No questions asked.

---

## Multiple Purchases Are Fine

Each purchase is standalone. Multiple purchases don't unlock anything extra - they're just additional license records.

**Access check:** Did this user pay for something? Yes → Access granted. That's it.

**Purchase history:** The app tracks all purchases and shows them to the user. Users can see their complete purchase history with tier and date.

**Example scenarios:**

1. Mike buys Personal ($50) in 2026. He has access. His account shows:
   - Personal License - January 2026

2. Later, Mike starts a business. He buys Commercial ($100) in 2028. His account now shows:
   - Personal License - January 2026
   - Commercial License - March 2028

   The app still works exactly the same. But Mike can see he has both licenses, and his conscience is clear to sell prints commercially.

3. Someone accidentally buys Personal twice. Their account shows two Personal purchases. They have access. No problem.

**Why this is simple:** Since tiers don't affect app functionality, we don't need upgrade/downgrade logic, tier-switching UI, proration calculations, or any of that complexity. Buy what you want. Each purchase stands alone.

**What we store and show:**

- Complete purchase history (tier + date) displayed to user
- Our analytics (how many Personal vs Commercial)
- Receipts and invoices

---

## Primary Flow: Makerworld

Makerworld crowdfunding is the main revenue source. Late pledge stays open indefinitely.

**Example flow:**

1. User finds Vector Projector on Makerworld
2. User backs the project at Personal tier ($50)
3. Makerworld gives them an access code
4. User goes to vectorprojector.weheart.art
5. User enters their Makerworld username + access code
6. App verifies and grants lifetime access

**If Makerworld becomes non-viable** (raises fees dramatically, locks us out, shuts down), we flip a switch (`crowdfundingActive` flag) and the app starts accepting Stripe payments instead.

---

## Fallback Flow: Stripe

If we switch to Stripe mode, users pay via Stripe hosted checkout (one-time payment, not subscription).

**Example flow:**

1. User finds vectorprojector.weheart.art
2. User clicks "Buy Personal - $50"
3. User is redirected to Stripe checkout (shows "Vector Projector" branding)
4. User pays
5. Stripe webhook notifies our system
6. App grants lifetime access

---

## Open Questions

### Refunds

The Convex Stripe component does NOT automatically handle refunds. If we refund someone in Stripe, our system won't know.

**Example problem:** Tom buys access for $50. Tom requests a refund. We refund him in Stripe. But his access is still active in our app because the system doesn't know about the refund.

**Options:**

1. Handle manually - when we process a refund in Stripe, also manually revoke access in Convex
2. Add a custom webhook handler for refunds (more code)
3. Accept the risk - refunds are rare, deal with it case-by-case

**Current decision:** Handle manually for now. Revisit if refunds become common.

### Access Verification for Stripe Payments

This only matters if we switch to Stripe mode (crowdfunding is OFF).

**The question:** When a user tries to use the app, how do we know they paid?

**Example scenario:** It's 2028. Makerworld raised fees to 30%, so we turned off crowdfunding mode. New users now pay via Stripe.

1. Jane visits vectorprojector.weheart.art
2. Jane signs up (creates account)
3. Jane clicks "Buy Commercial - $100"
4. Jane completes Stripe checkout
5. Stripe webhook fires, payment is recorded in Convex
6. Jane comes back to the app and tries to use it

**The check we need to build:** Did Jane pay? Yes or no. That's it.

- Look up Jane's payments (via `listPaymentsByUserId`)
- Find a successful payment for this app
- If yes → full app access
- If no → show "please purchase" message

The tier is stored in the payment record for record-keeping, but the app doesn't behave differently based on tier.

**For backers (crowdfunding ON):** We already have this. We check `backerAccessGrantedAt` on the user record.

**For Stripe payments (crowdfunding OFF):** This logic doesn't exist yet. Needs to be built when/if we switch to Stripe mode.
