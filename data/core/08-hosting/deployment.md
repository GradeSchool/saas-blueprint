---
last_updated: 2026-01-31
updated_by: vector-projector
change: "Added security headers section for vercel.json"
tldr: "Deploy to Vercel with Convex backend. Security headers, env vars, domains."
topics: [deployment, vercel, hosting, production, security]
---

# Deployment

Hosting and infrastructure.

## Account Access

### Vercel

**Login:** [vercel.com/login](https://vercel.com/login)

**Auth:** Google OAuth with `weheartdotart@gmail.com`

Make sure you're logged into Google with this account before accessing Vercel.

### Convex

**Login:** [dashboard.convex.dev](https://dashboard.convex.dev)

**Auth:** Check Convex dashboard for auth method used.

## Hosting Options

| Service | Pros | Cons |
|---------|------|------|
| Vercel | Easy, good DX, preview deploys | Can get expensive |
| Cloudflare Pages | Cheap, fast, good free tier | Less integrated |
| Netlify | Similar to Vercel | Similar trade-offs |

**Current choice:** Vercel

## Security Headers (vercel.json)

Create `vercel.json` at project root with security headers. These protect against XSS, clickjacking, and other attacks.

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Content-Security-Policy", "value": "..." },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=(), payment=()" }
      ]
    }
  ]
}
```

**See:** [hardening-patterns.md](../00-overview/hardening-patterns.md) for full CSP configuration.

**Note:** Headers only apply in production. Vite dev mode doesn't use vercel.json.

## Convex Backend

Convex backend is hosted by Convex (no self-hosting needed).

- Dev: Free tier
- Prod: Pro plan ($25/mo)

## Environment Variables

```bash
# .env.local (never commit)
CONVEX_DEPLOYMENT=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
```

Set these in Vercel project settings for production.

## Build Command

```bash
npm run build
```

## Domains

| App | Domain |
|-----|--------|
| Vector Projector | vectorprojector.weheart.art |

Configure in Vercel project settings > Domains.

## Notes

- Use preview deploys for PRs
- Set up proper environment variables per environment
- Monitor costs as traffic grows