---
last_updated: 2026-01-24
updated_by: vector-projector
change: "Initial critical notes"
status: todo
---

# Critical Notes

Items that need investigation before production.

## CRITICAL: Bot Protection & Rate Limiting

**Status:** NOT IMPLEMENTED - Must investigate before launch

### Problem

Public forms (signup, contact, etc.) are vulnerable to:
- Bot spam submissions
- Brute force attacks
- API abuse
- Cost attacks (triggering paid services like Resend)

### Solutions to Investigate

#### 1. Vercel Bot Protection

If hosting on Vercel, investigate their built-in bot protection:
- Vercel Firewall
- Bot detection via `x-vercel-ip-*` headers
- Edge middleware for blocking

**TODO:** Research Vercel's current bot protection offerings and pricing.

#### 2. Convex Rate Limiting

Convex has built-in rate limiting capabilities:

```typescript
import { RateLimiter } from "convex/ratelimit";

const rateLimiter = new RateLimiter({
  // Config here
});

// In mutation:
const result = await rateLimiter.check(ctx, "signup", ip);
if (!result.ok) {
  throw new Error("Too many requests");
}
```

**TODO:** 
- Research Convex rate limiting API
- Determine appropriate limits for signup, signin, email sends
- Implement site-wide rate limiting

#### 3. Turnstile / reCAPTCHA

Consider CAPTCHA for high-risk forms:
- Cloudflare Turnstile (free, privacy-focused)
- Google reCAPTCHA v3 (invisible)

**TODO:** Evaluate which CAPTCHA solution fits best.

### Recommended Approach

1. **Convex rate limiting** - First line of defense, server-side
2. **Vercel bot protection** - If on Vercel, enable at edge
3. **CAPTCHA** - For signup form specifically

### Priority

**HIGH** - Must implement before public launch. Without this:
- Bots can create unlimited accounts
- Email costs can spike from spam signups
- Brute force attacks on signin

---

## Hosting: Vercel

**Status:** Planned, not configured

These apps will likely be hosted on Vercel.

### TODO

- [ ] Configure Vercel project
- [ ] Set up custom domain
- [ ] Configure environment variables
- [ ] Enable bot protection
- [ ] Set up preview deployments
- [ ] Configure Convex production deployment

### Notes

- Vercel + Convex work well together
- Need to handle Convex URL for production vs preview
- Consider Vercel Edge Config for feature flags

---

## Other Critical Items

(Add items here as they come up)

### Production Checklist

- [ ] Bot protection implemented
- [ ] Rate limiting configured
- [ ] Resend domain verified
- [ ] Error monitoring (Sentry?)
- [ ] Analytics (PostHog?)
- [ ] Stripe integration tested
- [ ] HTTPS enforced
- [ ] Environment variables secured