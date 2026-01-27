---
last_updated: 2026-01-26
updated_by: vector-projector
change: "MAJOR UPDATE: Documented two verification systems, correct OTP flow, working client code"
status: tested
---

# Better Auth

Authentication with Better Auth and Convex. Supports email/password and Google OAuth.

## References (Read These First)

- **[Convex Better Auth - React/Vite Guide](https://labs.convex.dev/better-auth/framework-guides/react)** - Official docs for React/Vite setup
- **[React Example Repository](https://github.com/get-convex/better-auth/tree/main/examples/react)** - Working example code
- [Better Auth docs](https://www.better-auth.com/)
- [Resend docs](https://resend.com/docs)

---

## ⚠️ CRITICAL: Two Verification Systems

Better Auth has **two separate email verification systems** that are NOT connected:

| System | Config Location | Trigger | User Experience |
|--------|-----------------|---------|----------------|
| **Link-based** | `emailVerification.sendVerificationEmail` | Automatic with `requireEmailVerification: true` | User clicks link in email |
| **OTP-based** | `emailOTP` plugin with `sendVerificationOTP` | **MANUAL** - you must call it | User enters 6-digit code |

### The Trap

You might expect this configuration to work:

```typescript
// Server config
emailAndPassword: {
  requireEmailVerification: true,  // Expects link-based!
},
plugins: [
  emailOTP({ sendVerificationOTP: ... }),  // OTP-based
]
```

**IT DOESN'T.** Setting `requireEmailVerification: true` does NOT automatically trigger the `emailOTP` plugin. They're separate systems!

### The Solution

We use **OTP-based verification** (better UX - user stays in app). The flow requires **manual triggering** at each step:

```
1. signUp.email()              → Creates user (can't sign in yet)
2. emailOtp.sendVerificationOtp()  → Sends OTP (YOU must call this!)
3. emailOtp.verifyEmail()      → Verifies email
4. signIn.email()              → Signs user in (YOU must call this!)
```

See "Client Usage" section below for exact code.

---

## Critical Concepts

### Why React/Vite is Different

React/Vite apps run on `localhost:5173` (or similar). Convex backend runs on `*.convex.site`. These are **different domains**, which creates two challenges:

1. **CORS** - Browser blocks cross-origin requests by default
2. **OAuth Callbacks** - Google redirects to Convex, not your frontend

### The Solution: Cross-Domain Plugins

Better Auth provides `crossDomain` (server) and `crossDomainClient` (client) plugins specifically for this. **Both are required for React/Vite apps.**

### Two Convex URLs

| URL Pattern | Purpose |
|-------------|----------|
| `*.convex.cloud` | Database, queries, mutations |
| `*.convex.site` | HTTP routes (auth endpoints) |

The auth client must use the `.convex.site` URL.

---

## Auth Methods

| Method | Email Verification | Auto Sign-In | Notes |
|--------|-------------------|--------------|-------|
| Email/Password | Required (OTP) | NO - must sign in manually after verify | See flow below |
| Google OAuth | Not needed | YES - automatic | Google verifies identity |

---

## Environment Variables

### Convex Dashboard (Settings → Environment Variables)

These are **server-side** variables. Dev and prod deployments have separate env vars.

| Variable | How to Get | Example |
|----------|------------|----------|
| `BETTER_AUTH_SECRET` | Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` | `K7gNU3sdo+OL0wNhqoVWhr3g...` |
| `SITE_URL` | Your frontend URL | `http://localhost:5173` (dev) |
| `RESEND_API_KEY` | Resend dashboard → API Keys | `re_xxxxxxxxx` |
| `GOOGLE_CLIENT_ID` | Google Cloud Console | `xxxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console | `GOCSPX-xxxxxxxx` |

**BETTER_AUTH_SECRET:** Required for session encryption. Generate once per deployment.

**SITE_URL:** The frontend URL. Used for:
- `trustedOrigins` (CORS - which origins can make requests)
- OAuth redirects (where to send user after Google sign-in)

**RESEND_API_KEY:** Required for sending verification emails. A 401 error in Convex logs means this is missing or wrong.

### .env.local (Frontend)

```bash
# Deployment used by `npx convex dev`
CONVEX_DEPLOYMENT=dev:your-deployment-name

# Two different URLs - don't confuse them!
VITE_CONVEX_URL=https://your-deployment.convex.cloud
VITE_CONVEX_SITE_URL=https://your-deployment.convex.site
```

---

## Installation

```bash
npm install better-auth@1.4.9 --save-exact
npm install @convex-dev/better-auth resend @react-email/components
```

**Important:** Pin the Better Auth version. The Convex integration requires specific versions.

---

## File Structure

```
/convex
  convex.config.ts        # Register Better Auth component
  auth.config.ts          # Auth provider config
  auth.ts                 # Main auth setup
  emails.ts               # Email sending ("use node")
  http.ts                 # HTTP routes with CORS
/src/lib
  auth-client.ts          # Client-side auth
/src/components/modals
  AuthModal.tsx           # Sign up/sign in UI
```

---

## Server Implementation

### convex/convex.config.ts

```typescript
import { defineApp } from "convex/server";
import betterAuth from "@convex-dev/better-auth/convex.config";

const app = defineApp();
app.use(betterAuth);
export default app;
```

### convex/auth.config.ts

```typescript
import { getAuthConfigProvider } from "@convex-dev/better-auth/auth-config";
import type { AuthConfig } from "convex/server";

export default {
  providers: [getAuthConfigProvider()],
} satisfies AuthConfig;
```

### convex/auth.ts

```typescript
import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { requireActionCtx } from "@convex-dev/better-auth/utils";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { betterAuth } from "better-auth";
import { emailOTP } from "better-auth/plugins";
import authConfig from "./auth.config";

const siteUrl = process.env.SITE_URL!;

export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth({
    trustedOrigins: [siteUrl],
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
    },
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      },
    },
    plugins: [
      crossDomain({ siteUrl }),
      convex({ authConfig }),
      emailOTP({
        otpLength: 6,
        expiresIn: 600, // 10 minutes
        async sendVerificationOTP({ email, otp }) {
          const actionCtx = requireActionCtx(ctx);
          await actionCtx.runAction(internal.emails.sendTemplateEmail, {
            to: email,
            template: "verification",
            variables: { code: otp },
          });
        },
      }),
    ],
  });
};

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    try {
      return await authComponent.getAuthUser(ctx);
    } catch {
      return null;
    }
  },
});
```

**Key Points:**
- `requireActionCtx` imports from `@convex-dev/better-auth/utils` (NOT main package)
- `crossDomain({ siteUrl })` is REQUIRED for React/Vite
- `trustedOrigins: [siteUrl]` allows CORS from your frontend
- `emailOTP.sendVerificationOTP` is called when client calls `emailOtp.sendVerificationOtp()`

### convex/http.ts

```typescript
import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./auth";

const http = httpRouter();
authComponent.registerRoutes(http, createAuth, { cors: true });
export default http;
```

**Key Point:** `{ cors: true }` is REQUIRED for React/Vite.

---

## Client Implementation

### src/lib/auth-client.ts

```typescript
import { createAuthClient } from "better-auth/react";
import { convexClient, crossDomainClient } from "@convex-dev/better-auth/client/plugins";
import { emailOTPClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_CONVEX_SITE_URL,
  plugins: [convexClient(), crossDomainClient(), emailOTPClient()],
});
```

**Key Points:**
- `baseURL` MUST be `VITE_CONVEX_SITE_URL` (the `.convex.site` URL)
- `crossDomainClient()` is REQUIRED for React/Vite
- `emailOTPClient()` is REQUIRED for OTP verification methods

### src/main.tsx

```tsx
import { ConvexReactClient } from 'convex/react'
import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react'
import { authClient } from './lib/auth-client'

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL)

<ConvexBetterAuthProvider client={convex} authClient={authClient}>
  <App />
</ConvexBetterAuthProvider>
```

---

## Client Usage

### Check Auth State

```tsx
import { useConvexAuth } from 'convex/react'
const { isLoading, isAuthenticated } = useConvexAuth()
```

### Google OAuth (Simple - Auto Signs In)

```typescript
await authClient.signIn.social({ provider: "google" })
// Redirects to Google
// Auto-creates account if new user
// Auto-signs in user
// No verification needed
```

### Email/Password Sign Up (Complex - Manual Steps Required)

```typescript
// Step 1: Create the user
const result = await authClient.signUp.email({
  email: 'user@example.com',
  password: 'password123',
  name: 'User Name',
})
if (result.error) {
  // Handle error (e.g., "User already exists")
  return
}

// Step 2: MANUALLY trigger OTP send
const otpResult = await authClient.emailOtp.sendVerificationOtp({
  email: 'user@example.com',
  type: 'email-verification',
})
if (otpResult.error) {
  // Handle error
  return
}

// Step 3: Show OTP input UI, user enters code...

// Step 4: Verify the OTP
const verifyResult = await authClient.emailOtp.verifyEmail({
  email: 'user@example.com',
  otp: '123456',  // User-entered code
})
if (verifyResult.error) {
  // Handle error (e.g., "Invalid code")
  return
}

// Step 5: MANUALLY sign in (verification doesn't auto-sign-in!)
const signInResult = await authClient.signIn.email({
  email: 'user@example.com',
  password: 'password123',
})
if (signInResult.error) {
  // Handle error
  return
}

// User is now signed in!
```

### Email/Password Sign In (Existing Verified User)

```typescript
const result = await authClient.signIn.email({
  email: 'user@example.com',
  password: 'password123',
})
if (result.error) {
  // Handle error
  return
}
// User is signed in
```

### Resend Verification Code

```typescript
const result = await authClient.emailOtp.sendVerificationOtp({
  email: 'user@example.com',
  type: 'email-verification',
})
```

### Sign Out

```typescript
await authClient.signOut()
```

---

## Google OAuth Setup

See [google-oauth-setup.md](google-oauth-setup.md) for full Google Cloud Console setup.

**Critical:** The OAuth redirect URI must be your **Convex site URL**, not localhost:

```
https://your-deployment.convex.site/api/auth/callback/google
```

Google redirects to Convex → Convex handles auth → Convex redirects to your frontend.

---

## Lessons Learned (What NOT To Do)

### 1. Don't Expect emailOTP to Trigger Automatically

**Wrong assumption:** `requireEmailVerification: true` will use the `emailOTP` plugin.

**Reality:** They're separate systems. You must MANUALLY call `emailOtp.sendVerificationOtp()` after signup.

### 2. Don't Expect Auto-Sign-In After Verification

**Wrong assumption:** `emailOtp.verifyEmail()` will sign the user in.

**Reality:** It only verifies the email. You must MANUALLY call `signIn.email()` after verification.

### 3. Don't Skip the Cross-Domain Plugins

**Symptom:** 404 errors on `/api/auth/*` or CORS errors.

**Fix:** Both `crossDomain` (server) and `crossDomainClient` (client) are required for React/Vite.

### 4. Don't Use .convex.cloud for Auth

**Symptom:** 404 errors.

**Wrong:** `baseURL: import.meta.env.VITE_CONVEX_URL` (the `.cloud` URL)

**Right:** `baseURL: import.meta.env.VITE_CONVEX_SITE_URL` (the `.site` URL)

### 5. Don't Forget { cors: true }

**Symptom:** CORS errors.

**Wrong:** `authComponent.registerRoutes(http, createAuth)`

**Right:** `authComponent.registerRoutes(http, createAuth, { cors: true })`

### 6. Don't Use localhost for Google OAuth Redirect

**Symptom:** `redirect_uri_mismatch` error from Google.

**Wrong:** `http://localhost:5173/api/auth/callback/google`

**Right:** `https://your-deployment.convex.site/api/auth/callback/google`

### 7. Don't Import requireActionCtx from Main Package

**Symptom:** Build error about missing export.

**Wrong:** `import { requireActionCtx } from "@convex-dev/better-auth"`

**Right:** `import { requireActionCtx } from "@convex-dev/better-auth/utils"`

### 8. Don't Forget RESEND_API_KEY

**Symptom:** 401 error in Convex logs when sending email, or no email sent with no errors.

**Fix:** Set `RESEND_API_KEY` in Convex Dashboard → Settings → Environment Variables.

---

## Troubleshooting

| Error | Cause | Solution |
|-------|-------|----------|
| 404 on `/api/auth/*` | Wrong baseURL or missing crossDomain | Use `.convex.site` URL, add crossDomainClient |
| CORS error | Missing cors:true or crossDomain plugin | Add both |
| `redirect_uri_mismatch` | Google Console has wrong redirect URI | Use `convex.site` URL in Google Console |
| `requireActionCtx` not found | Wrong import path | Import from `@convex-dev/better-auth/utils` |
| Auth works but no session | Missing BETTER_AUTH_SECRET | Set in Convex dashboard |
| "Access blocked" from Google | Redirect URI not registered | Add exact URI to Google Console |
| 401 error sending email | Missing or wrong RESEND_API_KEY | Check Convex env vars |
| No email sent, no errors | OTP not triggered | Call `emailOtp.sendVerificationOtp()` after signup |
| Verified but not logged in | Missing sign-in call | Call `signIn.email()` after verification |
| "User not found" on sign-in | User doesn't exist or wrong endpoint | Check email, ensure signup completed |

---

## Current Status

**Working (Tested):**
- [x] Google OAuth sign-in (auto-creates account)
- [x] Email/password sign-up with OTP verification
- [x] Auto-sign-in after verification
- [x] Cross-domain setup for React/Vite
- [x] Environment variables configured
- [x] Verification emails sending via Resend

**Not Yet Tested:**
- [ ] Email/password sign-in (existing user)
- [ ] Sign out
- [ ] Session persistence
- [ ] Session enforcement (single session per user)
- [ ] Password reset

---

## Related

- [google-oauth-setup.md](google-oauth-setup.md) - Google Cloud Console setup
- [emails.md](emails.md) - Email system
- [signup-signin-sessions-flow.md](signup-signin-sessions-flow.md) - Full flow guide
- [testing.md](testing.md) - Testing patterns for solo devs
- [../02-frontend/single-session.md](../02-frontend/single-session.md) - Session enforcement