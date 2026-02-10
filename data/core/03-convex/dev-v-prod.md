---
last_updated: 2026-01-27
updated_by: vector-projector
change: "Initial dev vs prod workflow documentation"
tldr: "Dev and prod are separate apps sharing code. Workflow for safe deployments."
topics: [convex, deployment, dev, production, workflow]
---

# Dev vs Production

How Convex deployments work and the workflow for making changes safely.

## Mental Model

Think of dev and prod as **two completely separate apps** that share the same code:

| Aspect | Dev Deployment | Prod Deployment |
|--------|---------------|------------------|
| Database | Test data, fake users | Real data, real users |
| Env vars | Test API keys | Production API keys |
| URL | `dev:xxx.convex.cloud` | `xxx.convex.cloud` |
| Safety | Break anything | Touch carefully |

Data does not sync between them. Schema changes don't auto-migrate. They are isolated worlds.

## Deployment Types

| Type | Purpose | Who Gets One |
|------|---------|-------------|
| **Production** | Live app | One per project |
| **Development** | Local testing | One per developer |
| **Preview** | PR testing | Optional, created per PR |

Solo devs typically only need dev + prod. Staging/preview is for teams.

## Commands

| Command | What It Does |
|---------|-------------|
| `npx convex dev` | Syncs to dev deployment, watches for changes |
| `npx convex deploy` | Deploys to production |

You rarely run `npx convex deploy` manually. Vercel runs it automatically on push.

## Day-to-Day Workflows

### Building New Stuff (Pre-Launch)

Before you have real users, you have freedom:

1. Run `npx convex dev`
2. Make any changes - schema, functions, whatever
3. Test locally
4. Break things, delete data, experiment
5. No production to worry about

### After Launch: Adding New Features

Adding new tables, fields, or functions is safe:

1. Build and test in dev
2. Commit and push to GitHub
3. Vercel triggers `npx convex deploy`
4. New stuff appears in production (tables start empty)
5. Existing data is untouched

**Safe changes:**
- New tables
- New fields (with defaults or optional)
- New functions
- New indexes

### After Launch: Changing Existing Structures

This is where it gets careful. Convex protects you - it won't deploy a schema that doesn't match existing data.

**Example: Renaming `users.name` to `users.displayName`**

You cannot just rename. You must migrate:

1. Add `displayName` field (optional) - deploy
2. Write migration that copies `name` → `displayName` for all rows
3. Run migration in production
4. Update code to use `displayName` - deploy
5. Remove `name` field from schema - deploy

**The rule:** You can't delete or rename things that have data. Move the data first.

### Rolling Back a Bad Deploy

Convex doesn't have a rollback button. Instead:

1. Revert the commit in Git
2. Push the revert
3. Vercel redeploys previous code
4. Functions return to previous version

Data changes are harder - if a migration corrupted data, write a fix-it migration.

## Environment Variables

Each deployment has its own env vars, set separately in the Convex dashboard.

**First production deploy checklist:**

1. Go to Convex dashboard
2. Switch to production deployment (dropdown in top-left)
3. Go to Settings → Environment Variables
4. Add all the same vars as dev, but with production values:
   - `BETTER_AUTH_SECRET` (generate a new one for prod)
   - `SITE_URL` (your real domain)
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
   - `RESEND_API_KEY`

**Common mistake:** Forgetting to set env vars in prod, then wondering why auth doesn't work.

## Vercel Integration

The typical flow:

```
Local dev (safe sandbox)
    ↓ git push
GitHub
    ↓ triggers
Vercel build
    ↓ runs
npx convex deploy
    ↓
Production
```

### Vercel Setup

1. In Vercel project settings, set build command:
   ```
   npx convex deploy --cmd 'npm run build'
   ```

2. Add environment variable:
   - `CONVEX_DEPLOY_KEY` - get from Convex dashboard → Settings → Deploy Key

3. Your `VITE_CONVEX_URL` should point to production URL in Vercel env vars

## What Lives Where

| File | Purpose | Commit to Git? |
|------|---------|----------------|
| `.env.local` | Dev deployment config | No (in .gitignore) |
| `convex/_generated/` | Type definitions | Yes |
| Env vars | API keys, secrets | No (dashboard only) |

## Common Scenarios

### "I need to test with production-like data"

Options:
1. Manually create realistic test data in dev
2. Write a seed function that generates test data
3. Export data from prod (carefully) and import to dev

There's no automatic sync. This is intentional - you don't want test operations hitting real data.

### "I made a mistake in production"

See: [Emergency Procedures](../00-overview/emergency.md)

### "My schema change won't deploy"

Convex is telling you the schema doesn't match existing data. You need to:
1. Check what data exists that conflicts
2. Write a migration to fix it
3. Then deploy the schema change

### "Environment variables aren't working in prod"

1. Go to Convex dashboard
2. Make sure you're on the **production** deployment (check dropdown)
3. Verify all vars are set
4. Redeploy if you just added them

## Pre-Launch Checklist

Before your first real production deploy:

- [ ] Production env vars set in Convex dashboard
- [ ] `CONVEX_DEPLOY_KEY` set in Vercel
- [ ] `VITE_CONVEX_URL` points to prod in Vercel env vars
- [ ] Google OAuth redirect URI updated for prod domain
- [ ] Resend domain verified for prod
- [ ] Test the full auth flow on a preview deploy first

## Related

- [Emergency Procedures](../00-overview/emergency.md) - When things go wrong
- [Schema](schema.md) - Schema design patterns
- [Setup](setup.md) - Initial Convex setup