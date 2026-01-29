---
last_updated: 2026-01-28
updated_by: vector-projector
change: "Added env var validation section, updated rate limiting status, clarified bot protection for auth routes"
status: partial
---

# Critical Notes

Items that need implementation before production.

---

## Environment Variable Validation

**Status:** IMPLEMENTED

Required env vars are validated at startup with clear error messages.

### Pattern

```typescript
// convex/auth.ts
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
      `Set it in Convex Dashboard > Settings > Environment Variables.`
    );
  }
  return value;
}

const siteUrl = requireEnv("SITE_URL");
const googleClientId = requireEnv("GOOGLE_CLIENT_ID");
const googleClientSecret = requireEnv("GOOGLE_CLIENT_SECRET");
```

### Required Env Vars (Convex Dashboard)

| Variable | Purpose |
|----------|--------|
| `SITE_URL` | Frontend URL for OAuth redirects |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `BETTER_AUTH_SECRET` | Session encryption |
| `RESEND_API_KEY` | Email sending |

---

## Custom Domain for OAuth Branding

**Status:** TODO - Required for production

### The Problem

When users sign in with Google OAuth, they see an ugly, unprofessional consent screen:

```
"Sign in to amiable-yak-159.convex.site"
"Google will allow amiable-yak-159.convex.site to access..."
```

**AND your app logo won't display.**

This is because Google associates logos with **verified/owned domains**. Since `convex.site` is Convex's domain (not yours), Google can't verify ownership and:

1. Shows the raw Convex URL instead of your app name
2. **Refuses to display your uploaded logo**

Even if you upload a logo in the OAuth consent screen settings, it won't appear until you use a domain you own.

### What Users Should See

After custom domain setup:

```
"Sign in to Vector Projector"
"Google will allow api.vectorprojector.weheart.art to access..."
[Your app logo displayed]
```

### Why This Happens

Google OAuth redirects to your **callback URL**. With Convex, that URL is:
`https://[deployment].convex.site/api/auth/callback/google`

Google shows this domain to users on the consent screen. Google also requires domain ownership verification before displaying app logos—this prevents impersonation.

### The Solution

Convex supports **custom domains for HTTP routes**. Instead of `[deployment].convex.site`, you use your own domain like `api.vectorprojector.weheart.art`.

Once you:
1. Set up the custom domain in Convex
2. Verify domain ownership with Google (via Search Console)
3. Add the domain to OAuth consent screen authorized domains

...Google will display your app name and logo properly.

### Implementation Steps

#### Step 1: Set Up Custom Domain in Convex

1. Go to [Convex Dashboard](https://dashboard.convex.dev) → your project
2. Settings → Custom Domains (or Hosting)
3. Add custom domain: `api.vectorprojector.weheart.art`
4. Follow DNS instructions (add CNAME record pointing to Convex)
5. Wait for verification

**Official docs:** [Custom Domains & Hosting | Convex](https://docs.convex.dev/production/hosting/custom)

#### Step 2: Add Environment Variable

In Convex Dashboard → Settings → Environment Variables, add:

```
CUSTOM_AUTH_SITE_URL=https://api.vectorprojector.weheart.art
```

(No trailing slash)

**Why:** This tells Better Auth to use your custom domain for OAuth callbacks instead of the default `.convex.site` URL.

**Reference:** [Convex Auth Advanced - Custom Domains](https://labs.convex.dev/auth/advanced)

#### Step 3: Verify Domain with Google (Required for Logo)

**This step is required for the logo to display.**

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Add property: `api.vectorprojector.weheart.art`
3. Verify using DNS TXT record method:
   - Add TXT record provided by Google to your DNS
   - Wait for propagation (can take minutes to hours)
   - Click Verify in Search Console
4. Domain is now verified with Google

#### Step 4: Update Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials
2. Edit your OAuth client
3. Update Authorized redirect URIs:
   - Remove: `https://amiable-yak-159.convex.site/api/auth/callback/google`
   - Add: `https://api.vectorprojector.weheart.art/api/auth/callback/google`
4. Update Authorized JavaScript origins:
   - Add: `https://api.vectorprojector.weheart.art`
5. Save

#### Step 5: Update OAuth Consent Screen Branding

1. Google Cloud Console → APIs & Services → OAuth consent screen
2. Edit App:
   - App name: `Vector Projector`
   - App logo: Upload your logo
   - App domain / Homepage: `https://vectorprojector.weheart.art`
   - Privacy policy: `https://vectorprojector.weheart.art/privacy`
   - Terms of service: `https://vectorprojector.weheart.art/terms`
3. **Authorized domains:** Add `vectorprojector.weheart.art` (the domain you verified)
4. Save

#### Step 6: Publish App and Submit for Verification

If you added a logo, Google requires app verification:

1. OAuth consent screen → Publishing status
2. Click "Publish App" (moves from Testing to Production)
3. If verification required, submit verification request
4. Google reviews (can take days/weeks)

**Note:** Without verification, app stays in "Testing" mode (max 100 users). For production, verification is required anyway.

### Per-App Custom Domains

Each app needs its own custom domain:

| App | Custom Domain | Callback URL |
|-----|--------------|-------------|
| Vector Projector | `api.vectorprojector.weheart.art` | `.../api/auth/callback/google` |
| Tiler Styler | `api.tilerstyler.weheart.art` | `.../api/auth/callback/google` |

### DNS Setup (at your registrar)

Add CNAME record for Convex:

```
Host: api.vectorprojector
Type: CNAME
Value: (provided by Convex dashboard)
TTL: 3600
```

Add TXT record for Google verification:

```
Host: api.vectorprojector
Type: TXT
Value: (provided by Google Search Console)
TTL: 3600
```

### Verification Checklist

- [ ] Custom domain added in Convex dashboard
- [ ] DNS CNAME record added (for Convex)
- [ ] Domain verified in Convex
- [ ] DNS TXT record added (for Google Search Console)
- [ ] Domain verified in Google Search Console
- [ ] `CUSTOM_AUTH_SITE_URL` env var set
- [ ] Google Console redirect URI updated
- [ ] Google Console origins updated
- [ ] Authorized domains includes your domain
- [ ] OAuth consent screen branding updated (name, logo, links)
- [ ] App published (out of Testing mode)
- [ ] Google verification submitted (if logo added)
- [ ] **TEST:** Logo appears on consent screen

### References

- [Convex Custom Domains](https://docs.convex.dev/production/hosting/custom)
- [Convex Auth - Custom Domain for OAuth](https://labs.convex.dev/auth/advanced)
- [Google Search Console](https://search.google.com/search-console) - Domain verification
- [Google OAuth Verification](https://support.google.com/cloud/answer/9110914)

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
│  *** CRITICAL: This protects auth HTTP routes ***       │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│  LAYER 3: Convex Rate Limiting (PARTIALLY IMPLEMENTED)  │
│  - sessionCreate: Applied to ensureAppUser              │
│  - backerVerify: Applied to verifyBacker                │
│  - Auth HTTP routes: NOT covered (use BotID instead)    │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│  LAYER 4: Email Verification (Resend)                   │
│  - Confirms email ownership                             │
│  - Google OAuth users skip this entirely                │
└─────────────────────────────────────────────────────────┘
```

### Why BotID is Critical for Auth

Better Auth registers HTTP routes directly via `authComponent.registerRoutes()`. We don't have middleware hooks to inject rate limiting into these routes. The endpoints for OTP send/verify, sign-in, sign-up are exposed without Convex-level rate limiting.

**Vercel BotID fills this gap** by protecting these routes at the edge before requests reach Convex.

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

## Convex Rate Limiting

**Status:** PARTIALLY IMPLEMENTED

### What's Implemented

| Rule | Applied To | Key | Status |
|------|-----------|-----|--------|
| `sessionCreate` | `ensureAppUser` | Auth user ID | ✅ Done |
| `backerVerify` | `verifyBacker` | Username | ✅ Done |

### What's NOT Covered

| Endpoint | Why Not | Mitigation |
|----------|---------|------------|
| OTP send/verify | Better Auth HTTP routes, no middleware hook | Vercel BotID |
| Sign up | Better Auth HTTP routes | Vercel BotID |
| Sign in | Better Auth HTTP routes | Vercel BotID |

### Rules Defined (ready for future use)

```typescript
// convex/rateLimiter.ts
otpVerify: { kind: "fixed window", rate: 5, period: MINUTE },
otpSend: { kind: "fixed window", rate: 3, period: HOUR },
passwordReset: { kind: "fixed window", rate: 3, period: HOUR },
signUp: { kind: "fixed window", rate: 10, period: HOUR },
signIn: { kind: "fixed window", rate: 20, period: MINUTE },
backerVerify: { kind: "fixed window", rate: 5, period: MINUTE },
sessionCreate: { kind: "fixed window", rate: 10, period: MINUTE },
```

See [../03-convex/rate-limiting.md](../03-convex/rate-limiting.md) for full details.

---

## Email Strategy: Resend Free Tier

**Status:** IMPLEMENTED

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

## Production Checklist

### Environment Variables
- [x] Env var validation at startup (fails fast with clear errors)
- [ ] All env vars set in production Convex deployment

### Custom Domain / OAuth Branding
- [ ] Custom domain set up in Convex (`api.vectorprojector.weheart.art`)
- [ ] DNS CNAME configured
- [ ] Domain verified in Google Search Console (required for logo)
- [ ] `CUSTOM_AUTH_SITE_URL` env var set
- [ ] Google Console redirect URIs updated to custom domain
- [ ] Google Console authorized domains includes your domain
- [ ] OAuth consent screen branding (app name, logo, links)
- [ ] Google app verification submitted
- [ ] **Verified:** Logo displays on consent screen

### Vercel
- [ ] Create Vercel account (Pro tier)
- [ ] Enable WAF Bot Protection
- [ ] Configure BotID on signup/login routes
- [ ] Set up custom domain for frontend

### Resend
- [x] Create Resend account (free tier)
- [x] Verify `weheart.art` domain
- [x] Add `RESEND_API_KEY` to Convex env
- [x] Update `FROM_EMAIL` in `convex/emails.ts`

### Security
- [x] CORS restricted to allowed origins
- [x] `addBacker` is internal-only mutation
- [x] `verifyBacker` rate limited
- [x] `ensureAppUser` rate limited
- [x] Safe storage helpers (localStorage/sessionStorage)
- [x] BroadcastChannel wrapped in try/catch
- [ ] Vercel BotID for auth HTTP routes

### Per-App
- [ ] BotID integration on auth routes
- [x] Test email verification flow
- [x] Test Google OAuth flow
- [ ] Privacy policy page
- [ ] Terms of service page

---

## Cost Summary

| Service | Tier | Monthly Cost |
|---------|------|--------------|
| Vercel | Pro | $20 |
| Resend | Free | $0 |
| BotID Deep Analysis | ~1k calls | ~$1 |
| **Total** | | **~$21/mo** |

Scales with usage. Resend upgrade ($20/mo) only needed if exceeding 3k emails/month.