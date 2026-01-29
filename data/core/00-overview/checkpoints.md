---
last_updated: 2026-01-29
updated_by: vector-projector
change: "Initial creation - validation checkpoints for app setup"
status: tested
context_cost: 1KB
type: reference
---

# Setup Checkpoints

Validation points after each major setup phase. Use these to verify progress before continuing.

---

## After Stack Setup

**Files created:**
- `vite.config.ts` (with aliases and React Compiler)
- `tsconfig.json` + `tsconfig.app.json` (with paths)
- `src/index.css` (with `@import "tailwindcss"`)
- `components.json` (shadcn config)

**Verify:**
```bash
npm run build && npm run lint
```

---

## After Convex Setup

**Files created:**
- `convex/schema.ts`
- `convex/_generated/` folder
- `.env.local` (with CONVEX_DEPLOYMENT, VITE_CONVEX_URL)

**Verify:**
- Convex dashboard shows your project
- `npm run build` passes

---

## After Auth Setup

**Files created:**
- `convex/convex.config.ts`
- `convex/auth.config.ts`
- `convex/auth.ts`
- `convex/http.ts`
- `convex/emails.ts`
- `src/lib/auth-client.ts`

**Env vars set (Convex Dashboard):**
- `BETTER_AUTH_SECRET`
- `SITE_URL`
- `RESEND_API_KEY`
- `GOOGLE_CLIENT_ID` (if using Google)
- `GOOGLE_CLIENT_SECRET` (if using Google)

**Verify:**
- Convex dashboard shows `betterAuth:user` table
- `npm run build` passes
- Can sign up with email (check Convex logs for OTP)

---

## After Session Setup

**Files created/modified:**
- `src/hooks/useSession.ts`
- `convex/users.ts` (validateSession, ensureAppUser)
- `convex/schema.ts` (activeSessionId, sessionStartedAt fields)

**Verify:**
- Sign in creates session in localStorage
- Opening duplicate tab shows warning
- Signing in on another device kicks first session

---

## Common Issues at Each Stage

| Stage | Issue | Fix |
|-------|-------|-----|
| Stack | shadcn init fails | Ensure Tailwind installed, aliases in BOTH tsconfigs |
| Convex | Types not generating | Run `npx convex dev` |
| Auth | 404 on /api/auth | Use `.convex.site` URL, add crossDomainClient |
| Auth | No email sent | Check RESEND_API_KEY in Convex env |
| Session | Both tabs show duplicate | Check isDuplicateFor tiebreaker logic |

---

## Related

- [quickstart-manifest.md](quickstart-manifest.md) - What to read
- [agent-workflow.md](agent-workflow.md) - Agent rules