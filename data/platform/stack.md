---
last_updated: 2026-01-24
updated_by: vector-projector
change: "Updated Vercel to Pro tier, clarified Resend free strategy"
status: planned
---

# Platform Stack

## Domain & Business Entity

**Domain:** `weheart.art` — registered at Spaceship

**Business:** WeHeartArt LLC (or similar), single bank account, single Stripe account

**Apps live at subdomains:** `vectorprojector.weheart.art`, `tilerstyler.weheart.art`, etc.

---

## Platform-Wide Services (One Account)

These are shared across all apps. One login, one dashboard.

| Service | Purpose | Tier | Notes |
|---------|---------|------|-------|
| **Spaceship** | Domain registration | — | Manages weheart.art |
| **Google** | OAuth + YouTube | Free | Account: `weheartdotart@gmail.com`. Separate Cloud Console project per app for branding. |
| **Stripe** | Payments | — | Single account. Each app has 1-4 products. |
| **Vercel** | Hosting + Bot Protection | **Pro ($20/mo)** | BotID for bot protection. Separate project per app. |
| **Discord** | Community support | Free | One server, separate channel per app. |
| **Makerworld** | Marketing | — | Single profile. Crowdfunding launches. |
| **PostHog** | Analytics | Free | Investigate: separate projects per app. |
| **Resend** | Transactional email | **Free (3k/mo)** | Single domain `weheart.art` for all apps. See email strategy below. |

---

## Per-App Services

Each app gets its own instance of these.

| Service | Purpose | Notes |
|---------|---------|-------|
| **Spacemail** | Support email | `appname@weheart.art` — $1/month per app. |
| **GitHub** | Code | Separate repo per app. |
| **Convex** | Database | Separate project per app. |
| **Vercel Project** | Deployment | One project per app under shared Vercel account. |
| **Google Cloud Project** | OAuth branding | Separate project so consent screen shows app name/logo. |

---

## Vercel Pro + Bot Protection

**Why Pro tier:**
- BotID Deep Analysis for sophisticated bot protection
- WAF Bot Protection (also free, but Pro unlocks full BotID)
- Better observability and logs
- Higher limits for production

**BotID usage:**
- Apply to high-value routes only: signup, login, password reset
- Cost: $1 per 1,000 `checkBotId()` calls
- Estimated: $1-10/month depending on signup volume

**See:** [critical-notes.md](../core/00-overview/critical-notes.md) for full bot protection strategy.

---

## Email Strategy

**Resend Free Tier:** 3,000 emails/month, 1 domain only.

**The Pattern:** All apps send from root domain with app name in display name:

```
From: Vector Projector <noreply@weheart.art>
From: Tiler Styler <noreply@weheart.art>
```

**Why this works:**
- One verified domain (`weheart.art`) covers all apps
- Display name + subject line identifies the app
- 3,000 emails/month is plenty for early stage
- Google OAuth users require zero emails

**Upgrade path:** Resend Pro ($20/mo) when approaching 3k emails/month.

**Support email:** Separate per app via Spacemail:
- `vectorprojector@weheart.art`
- `tilerstyler@weheart.art`
- Cost: $1/month per app

---

## Auth Strategy

**Supported methods:**
- Google OAuth (primary, zero emails)
- Email/password with verification (for non-Google users)

**Not supported:**
- Apple OAuth
- Meta OAuth
- GitHub OAuth
- Any other OAuth providers

**Rationale:** Keep it simple. Google covers most users. Email/password catches the rest. More OAuth = more Cloud Console projects, more maintenance.

---

## Cost Summary (Platform-Wide)

| Service | Monthly Cost |
|---------|-------------|
| Vercel Pro | $20 |
| Resend Free | $0 |
| BotID (~1k calls) | ~$1 |
| Spacemail (per app) | $1/app |
| **Base platform** | **~$21** |
| **Per additional app** | **+$1** |

---

## Open Questions

- **Convex rate limiting:** Need to research and implement. See critical-notes.md.
- **PostHog:** Confirm multi-app setup (one account, multiple projects?).
- **Google OAuth:** Document Cloud Console setup per app.