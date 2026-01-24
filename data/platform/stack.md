---
last_updated: 2026-01-24
updated_by: saas-blueprint
change: "Documented platform stack with weheart.art domain and services"
---

# Platform Stack

## Domain & Business Entity

**Domain:** `weheart.art` — registered at Spaceship

**Business:** WeHeartArt LLC (or similar), single bank account, single Stripe account

**Apps live at subdomains:** `vectorprojector.weheart.art`, `tilerstyler.weheart.art`, etc.

---

## Platform-Wide Services (One Account)

These are shared across all apps. One login, one dashboard.

| Service | Purpose | Notes |
|---------|---------|-------|
| **Spaceship** | Domain registration | Manages weheart.art |
| **Google** | OAuth + YouTube | Account: `weheartart` / `weheartdotart@gmail.com`. One account handles sign-in for all apps (separate Cloud Console projects per app for branding). One YouTube channel with playlists per app. |
| **Stripe** | Payments | Single account. Each app has 1-4 products (one-off purchases or monthly tiers). |
| **Vercel** | Hosting | Single account (start at Hobby tier). Separate project per app. |
| **Discord** | Community support | One server, separate channel/topic per app. Primary support channel. |
| **Makerworld** | Marketing | Single profile. Crowdfunding launches, cross-promotion. |
| **PostHog** | Analytics | Single account. Investigate: likely separate projects per app. |
| **Resend** | Transactional email | Signup/auth emails only. Would love to eliminate if possible. |

---

## Per-App Services

Each app gets its own instance of these.

| Service | Purpose | Notes |
|---------|---------|-------|
| **Spacemail** | Support email | `appname@weheart.art` — $1/month per app. Separate webmail inbox for each app. Clean separation. |
| **GitHub** | Code | Separate repo per app. Keeps CI/CD isolated. |
| **Convex** | Database | Separate project per app. Schema isolation, no cross-app risk. |
| **Vercel Project** | Deployment | One project per app under the shared Vercel account. |

---

## Email Strategy

**Support email:** Each app has its own address via Spacemail.
- `vectorprojector@weheart.art`
- `tilerstyler@weheart.art`
- etc.

**Cost:** $1/month per app. At 5 apps = $5/month.

**Why not Gmail?** We considered a single Gmail with `+appname` aliases, but separate inboxes per app provides cleaner mental separation. Each app's email is its own tab/login. No filtering or labeling needed.

**Transactional email (signup, password reset):** Still using Resend for now. Evaluate whether this is necessary—if using OAuth exclusively, signup emails may be skippable.

---

## Service Count

**Platform-wide:** See table above (shared across all apps)

**Per-app:** See table above (each app gets its own instance)

---

## Open Questions

- **Resend:** Can we eliminate this? Only needed if we send signup/auth emails. If OAuth-only, maybe not needed.
- **PostHog:** Confirm how multi-app setup works (one account, multiple projects?).
- **Vercel Hobby limits:** Plan for upgrade when bandwidth/execution limits are hit.
