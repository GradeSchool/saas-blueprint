---
last_updated: 2026-01-28
updated_by: vector-projector
change: "Added account access info"
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