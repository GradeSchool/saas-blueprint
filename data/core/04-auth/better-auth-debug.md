---
last_updated: 2026-01-29
updated_by: vector-projector
change: "Split from better-auth.md - debug and troubleshooting content"
status: tested
context_cost: 4KB
type: reference
requires: [core/04-auth/better-auth.md]
tldr: "Auth troubleshooting guide. Read when something breaks with Better Auth."
topics: [auth, better-auth, debugging, troubleshooting, reference]
---

# Better Auth - Debug Guide

Troubleshooting, lessons learned, and error reference. **Read this when something breaks.**

For setup, see [better-auth.md](better-auth.md).

---

## Critical Concepts

### Why React/Vite is Different

React/Vite apps run on `localhost:5173`. Convex backend runs on `*.convex.site`. These are **different domains**, creating:

1. **CORS issues** - Browser blocks cross-origin requests
2. **OAuth callback issues** - Google redirects to Convex, not frontend

**Solution:** Both `crossDomain` (server) and `crossDomainClient` (client) plugins are REQUIRED.

### Two Convex URLs

| URL Pattern | Purpose |
|-------------|----------|
| `*.convex.cloud` | Database, queries, mutations |
| `*.convex.site` | HTTP routes (auth endpoints) |

**The auth client MUST use `.convex.site`**

---

## Two Verification Systems (The Trap)

Better Auth has **two separate email verification systems** that are NOT connected:

| System | Config | Trigger |
|--------|--------|--------|
| **Link-based** | `emailVerification.sendVerificationEmail` | Automatic |
| **OTP-based** | `emailOTP` plugin | MANUAL - you must call it |

### The Trap

```typescript
// You might expect this to work:
emailAndPassword: {
  requireEmailVerification: true,  // Expects link-based!
},
plugins: [
  emailOTP({ sendVerificationOTP: ... }),  // OTP-based
]
```

**IT DOESN'T.** They're separate systems. Setting `requireEmailVerification: true` does NOT trigger the `emailOTP` plugin.

### The Solution

We use OTP-based (better UX). The flow requires **manual triggering**:

```
1. signUp.email()                    → Creates user
2. emailOtp.sendVerificationOtp()    → Sends OTP (YOU must call!)
3. emailOtp.verifyEmail()            → Verifies email
4. signIn.email()                    → Signs in (YOU must call!)
```

---

## Lessons Learned (What NOT To Do)

### 1. Don't Expect emailOTP to Trigger Automatically

**Wrong:** `requireEmailVerification: true` will use the `emailOTP` plugin.

**Reality:** They're separate. Call `emailOtp.sendVerificationOtp()` manually after signup.

### 2. Don't Expect Auto-Sign-In After Verification

**Wrong:** `emailOtp.verifyEmail()` will sign the user in.

**Reality:** It only verifies. Call `signIn.email()` manually after verification.

### 3. Don't Skip the Cross-Domain Plugins

**Symptom:** 404 errors on `/api/auth/*` or CORS errors.

**Fix:** Both `crossDomain` (server) and `crossDomainClient` (client) required.

### 4. Don't Use .convex.cloud for Auth

**Symptom:** 404 errors.

**Wrong:** `baseURL: import.meta.env.VITE_CONVEX_URL`

**Right:** `baseURL: import.meta.env.VITE_CONVEX_SITE_URL`

### 5. Don't Forget { cors: true }

**Symptom:** CORS errors.

**Wrong:** `authComponent.registerRoutes(http, createAuth)`

**Right:** `authComponent.registerRoutes(http, createAuth, { cors: true })`

### 6. Don't Use localhost for Google OAuth Redirect

**Symptom:** `redirect_uri_mismatch` from Google.

**Wrong:** `http://localhost:5173/api/auth/callback/google`

**Right:** `https://your-deployment.convex.site/api/auth/callback/google`

### 7. Don't Import requireActionCtx from Main Package

**Symptom:** Build error about missing export.

**Wrong:** `import { requireActionCtx } from "@convex-dev/better-auth"`

**Right:** `import { requireActionCtx } from "@convex-dev/better-auth/utils"`

### 8. Don't Forget RESEND_API_KEY

**Symptom:** 401 error in Convex logs, or no email sent.

**Fix:** Set `RESEND_API_KEY` in Convex Dashboard → Settings → Environment Variables.

---

## Troubleshooting Table

| Error | Cause | Solution |
|-------|-------|----------|
| 404 on `/api/auth/*` | Wrong baseURL or missing crossDomain | Use `.convex.site` URL, add crossDomainClient |
| CORS error | Missing cors:true or crossDomain plugin | Add both |
| `redirect_uri_mismatch` | Google Console has wrong URI | Use `convex.site` URL in Google Console |
| `requireActionCtx` not found | Wrong import path | Import from `@convex-dev/better-auth/utils` |
| Auth works but no session | Missing BETTER_AUTH_SECRET | Set in Convex dashboard |
| "Access blocked" from Google | Redirect URI not registered | Add exact URI to Google Console |
| 401 error sending email | Missing RESEND_API_KEY | Check Convex env vars |
| No email sent, no errors | OTP not triggered | Call `emailOtp.sendVerificationOtp()` |
| Verified but not logged in | Missing sign-in call | Call `signIn.email()` after verification |
| "User not found" on sign-in | User doesn't exist | Check email, ensure signup completed |

---

## References

- [Convex Better Auth - React/Vite Guide](https://labs.convex.dev/better-auth/framework-guides/react)
- [React Example Repository](https://github.com/get-convex/better-auth/tree/main/examples/react)
- [Better Auth docs](https://www.better-auth.com/)
- [Resend docs](https://resend.com/docs)

---

## Related

- [better-auth.md](better-auth.md) - Setup guide
- [google-oauth-setup.md](google-oauth-setup.md) - Google Cloud Console setup
- [../02-frontend/auth-ui-state.md](../02-frontend/auth-ui-state.md) - UI state management