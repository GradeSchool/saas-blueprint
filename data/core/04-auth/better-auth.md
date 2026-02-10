---
last_updated: 2026-01-29
updated_by: vector-projector
change: "Split from monolithic doc - setup only, debug moved to better-auth-debug.md"
status: tested
context_cost: 3KB
type: setup
requires: [core/01-setup/stack.md, core/03-convex/setup.md]
unlocks: [core/02-frontend/single-session.md, core/04-auth/google-oauth-setup.md]
tldr: "Set up Better Auth with Convex for email/password and Google OAuth login."
topics: [auth, better-auth, oauth, convex, setup]
---

# Better Auth

Authentication with Better Auth and Convex. Supports email/password and Google OAuth.

**Debug guide:** [better-auth-debug.md](better-auth-debug.md) - Troubleshooting, lessons learned, error reference

---

## Installation

```bash
npm install better-auth@1.4.9 --save-exact
npm install @convex-dev/better-auth resend @react-email/components
```

---

## Environment Variables

### Convex Dashboard (Settings → Environment Variables)

| Variable | Value |
|----------|-------|
| `BETTER_AUTH_SECRET` | `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `SITE_URL` | `http://localhost:5173` (dev) or production URL |
| `RESEND_API_KEY` | From Resend dashboard |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |

### .env.local (Frontend)

```bash
CONVEX_DEPLOYMENT=dev:your-deployment-name
VITE_CONVEX_URL=https://your-deployment.convex.cloud
VITE_CONVEX_SITE_URL=https://your-deployment.convex.site
```

---

## Server Files

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
        expiresIn: 600,
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

### convex/http.ts

```typescript
import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./auth";

const http = httpRouter();
authComponent.registerRoutes(http, createAuth, { cors: true });
export default http;
```

---

## Client Files

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

### Google OAuth

```typescript
await authClient.signIn.social({ provider: "google" })
// Redirects to Google, auto-creates account, auto-signs in
```

### Email/Password Sign Up

```typescript
// 1. Create user
await authClient.signUp.email({ email, password, name })

// 2. Send OTP (must call manually!)
await authClient.emailOtp.sendVerificationOtp({ email, type: 'email-verification' })

// 3. Verify OTP
await authClient.emailOtp.verifyEmail({ email, otp: userEnteredCode })

// 4. Sign in (verification doesn't auto-sign-in!)
await authClient.signIn.email({ email, password })
```

### Sign Out

```typescript
await authClient.signOut()
```

---

## Google OAuth Setup

See [google-oauth-setup.md](google-oauth-setup.md) for Google Cloud Console configuration.

**Critical:** Redirect URI must be `https://your-deployment.convex.site/api/auth/callback/google`

---

## Related

- [better-auth-debug.md](better-auth-debug.md) - Troubleshooting and error reference
- [google-oauth-setup.md](google-oauth-setup.md) - Google Cloud Console setup
- [emails.md](emails.md) - Email templates
- [../02-frontend/single-session.md](../02-frontend/single-session.md) - Session enforcement