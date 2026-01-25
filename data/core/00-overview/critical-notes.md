---
last_updated: 2026-01-24
updated_by: vector-projector
change: "Added Vercel Pro + BotID and Resend free tier strategy"
status: planned
---

# Critical Notes

Items that need implementation before production.

---

## Bot Protection Strategy

**Status:** PLANNED

### The Stack

```
┌─────────────────────────────────────────────────────────┐
│  LAYER 1: Vercel WAF Bot Protection (Free)              │
│  - Challenges non-browser traffic                       │
│  - Blocks curl/scripts pretending to be browsers        │
│  - Allows verified bots (Googlebot, etc.)               │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│  LAYER 2: Vercel BotID (Pro tier)                       │
│  - Invisible CAPTCHA powered by Kasada                  │
│  - Apply to: signup, login, password reset              │
│  - Basic: free, Deep Analysis: $1/1000 calls            │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│  LAYER 3: Convex Rate Limiting                          │
│  - Limit signups per IP (e.g., 5/hour)                  │
│  - Limit login attempts per email (e.g., 10/hour)       │
│  - Limit password resets (e.g., 3/hour)                 │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│  LAYER 4: Email Verification (Resend)                   │
│  - Confirms email ownership                             │
│  - Google OAuth users skip this entirely                │
└─────────────────────────────────────────────────────────┘
```

### Vercel Pro + BotID

**Recommendation:** Start with Vercel Pro ($20/mo)

**Why Pro:**
- BotID Deep Analysis available ($1/1000 calls)
- Better observability and logs
- Higher limits for production apps

**BotID Levels:**

| Level | Availability | Cost | Protection |
|-------|--------------|------|------------|
| WAF Bot Protection | All plans | Free | Basic, challenges non-browser traffic |
| BotID Basic | All plans | Free | Validates challenge integrity |
| BotID Deep Analysis | Pro/Enterprise | $1/1000 calls | ML analysis, catches sophisticated bots |

**Deep Analysis protects against:**
- Credential stuffing / brute force
- Playwright / Puppeteer automation
- Data scraping
- API abuse
- Spam signups

**Implementation:**
1. Enable WAF Bot Protection in Vercel dashboard (one click)
2. Install BotID package in app
3. Call `checkBotId()` on signup/login/reset routes only
4. Only charged for `checkBotId()` calls, not page views

**Estimated costs:**
- 1,000 signups/month = $1/month
- 10,000 signups/month = $10/month

**Resources:**
- [Vercel BotID Docs](https://vercel.com/docs/botid)
- [Bot Management Docs](https://vercel.com/docs/bot-management)

---

## Email Strategy: Resend Free Tier

**Status:** PLANNED

### Resend Free Tier Limits

| Feature | Free | Pro ($20/mo) |
|---------|------|---------------|
| Emails/month | 3,000 | 50,000 |
| Domains | 1 | Unlimited |
| Analytics | No | Yes |
| Log retention | 1 day | 3 days |

### The Pattern: One Domain for All Apps

**Problem:** Free tier = 1 domain only. We have multiple apps at subdomains.

**Solution:** Send all emails from root domain `weheart.art`:

```
From: Vector Projector <noreply@weheart.art>
Subject: Verify your Vector Projector account

From: Tiler Styler <noreply@weheart.art>
Subject: Verify your Tiler Styler account
```

**Why this works:**
- One verified domain covers all apps
- Display name identifies the app
- Subject line makes it clear which app
- Users don't care about the actual email domain

**Implementation:**

```typescript
// convex/emails.ts
const APP_NAME = "Vector Projector"; // Change per app
const FROM_EMAIL = `${APP_NAME} <noreply@weheart.art>`;
```

**Capacity:**
- 3,000 emails/month across ALL apps combined
- Verification emails only (Google OAuth users = 0 emails)
- Plenty for early stage

**Upgrade trigger:** When approaching 3,000 emails/month, upgrade to Resend Pro ($20/mo) for 50k emails and unlimited domains.

---

## Convex Rate Limiting

**Status:** TODO - Needs research and implementation

**What to rate limit:**

| Endpoint | Suggested Limit |
|----------|----------------|
| Signup | 5 per IP per hour |
| Login attempts | 10 per email per hour |
| Password reset | 3 per email per hour |
| Email sends | 10 per IP per hour |

**TODO:**
- [ ] Research Convex rate limiting API
- [ ] Implement rate limiter utility
- [ ] Apply to auth endpoints
- [ ] Add to blueprint when tested

---

## Production Checklist

### Vercel
- [ ] Create Vercel account (Pro tier)
- [ ] Enable WAF Bot Protection
- [ ] Configure BotID on signup/login routes
- [ ] Set up custom domain

### Resend
- [ ] Create Resend account (free tier)
- [ ] Verify `weheart.art` domain
- [ ] Add `RESEND_API_KEY` to Convex env
- [ ] Update `FROM_EMAIL` in `convex/emails.ts`

### Convex
- [ ] Implement rate limiting
- [ ] Configure production deployment

### Per-App
- [ ] BotID integration on auth routes
- [ ] Test email verification flow
- [ ] Test Google OAuth flow

---

## Cost Summary

| Service | Tier | Monthly Cost |
|---------|------|-------------|
| Vercel | Pro | $20 |
| Resend | Free | $0 |
| BotID Deep Analysis | ~1k calls | ~$1 |
| **Total** | | **~$21/mo** |

Scales with usage. Resend upgrade ($20/mo) only needed if exceeding 3k emails/month.