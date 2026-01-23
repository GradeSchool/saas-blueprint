---
last_updated: 2026-01-23
updated_by: saas-blueprint
change: "Initial deployment setup"
---

# Deployment

Hosting and infrastructure.

## Options

| Service | Pros | Cons |
|---------|------|------|
| Vercel | Easy, good DX, preview deploys | Can get expensive |
| Cloudflare Pages | Cheap, fast, good free tier | Less integrated |
| Netlify | Similar to Vercel | Similar trade-offs |

## Convex

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

## Build Command

```bash
npm run build
```

## Notes

- Use preview deploys for PRs
- Set up proper environment variables per environment
- Monitor costs as traffic grows
