---
last_updated: 2026-01-25
updated_by: vector-projector
change: "Updated to include Google OAuth support"
status: in-progress
---

# Better Auth

Authentication with Better Auth and Convex. Supports email/password and Google OAuth.

## Auth Methods

| Method | Email Verification | Notes |
|--------|-------------------|-------|
| Email/Password | Required | 6-digit code via Resend |
| Google OAuth | Not needed | Google verifies identity |

## OAuth Strategy

**Google OAuth only.** No Apple, Meta, GitHub, or other providers.

- One Google account (`weheartdotart@gmail.com`) for all apps
- Separate Cloud Console project per app (for branding)
- See [google-oauth-setup.md](google-oauth-setup.md) for setup guide

## Prerequisites

- Convex set up and running (see [../03-convex/setup.md](../03-convex/setup.md))
- `npx convex dev` running in terminal
- Resend account with verified domain
- Google Cloud project with OAuth credentials

**Environment Variables (Convex Dashboard):**

```
RESEND_API_KEY=re_xxxxxxxxx
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxx
```

## Reference

- [Convex Better Auth docs](https://labs.convex.dev/better-auth)
- [Better Auth docs](https://www.better-auth.com/)
- [Resend docs](https://resend.com/docs)

## Installation

```bash
npm install better-auth @convex-dev/better-auth resend @react-email/components @react-email/render
```

## File Structure

```
/emails
  VerificationEmail.tsx   # React Email template (for design/preview)
/convex
  convex.config.ts        # Register Better Auth component
  auth.config.ts          # Auth provider config
  auth.ts                 # Main auth setup with emailOTP + Google
  emails.ts               # Email sending action (use node)
  http.ts                 # Auth HTTP routes
/src/lib
  auth-client.ts          # Client-side auth
```

## Step 1: convex.config.ts

```typescript
import { defineApp } from "convex/server";
import betterAuth from "@convex-dev/better-auth/convex.config";

const app = defineApp();
app.use(betterAuth);
export default app;
```

## Step 2: auth.config.ts

```typescript
import { getAuthConfigProvider } from "@convex-dev/better-auth/auth-config";
import type { AuthConfig } from "convex/server";

export default {
  providers: [getAuthConfigProvider()],
} satisfies AuthConfig;
```

## Step 3: emails.ts (Node action)

See [emails.md](emails.md) for full implementation.

## Step 4: auth.ts

```typescript
import { createClient, type GenericCtx, requireActionCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { betterAuth } from "better-auth";
import { emailOTP } from "better-auth/plugins";
import authConfig from "./auth.config";

const siteUrl = "http://localhost:5173"; // Update for production

export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth({
    baseURL: siteUrl,
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

## Step 5: http.ts

```typescript
import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./auth";

const http = httpRouter();
authComponent.registerRoutes(http, createAuth);
export default http;
```

## Step 6: auth-client.ts

```typescript
import { createAuthClient } from "better-auth/react";
import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { emailOTPClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [convexClient(), emailOTPClient()],
});
```

## Step 7: Update main.tsx

Use `ConvexBetterAuthProvider`, not plain `ConvexProvider`:

```tsx
import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react'
import { authClient } from './lib/auth-client'

<ConvexBetterAuthProvider client={convex} authClient={authClient}>
  <App />
</ConvexBetterAuthProvider>
```

## Client Usage

### Check Auth State

```tsx
import { useConvexAuth } from 'convex/react'

const { isLoading, isAuthenticated } = useConvexAuth()
```

### Sign Up (Email/Password)

```typescript
const result = await authClient.signUp.email({
  email: 'user@example.com',
  password: 'password123',
  name: 'User Name',
})
// Then verify with OTP
```

### Sign In (Email/Password)

```typescript
const result = await authClient.signIn.email({
  email: 'user@example.com',
  password: 'password123',
})
```

### Sign In (Google OAuth)

```typescript
await authClient.signIn.social({ provider: "google" })
// Redirects to Google, then back to app
```

### Verify Email OTP

```typescript
const result = await authClient.emailOtp.verifyEmail({
  email: 'user@example.com',
  otp: '123456',
})
```

### Sign Out

```typescript
await authClient.signOut()
```

## Gotchas

| Problem | Solution |
|---------|----------|
| `Could not find ConvexProviderWithAuth` | Use `ConvexBetterAuthProvider` |
| `DataModel is a type` error | Use `import type { DataModel }` |
| `process is not defined` | Hardcode siteUrl or use Convex env vars |
| Modal closes without error | Better Auth returns `{ data, error }` - check `result.error` |
| Google OAuth redirect error | Check redirect URI in Cloud Console matches exactly |

## Next Steps

1. [google-oauth-setup.md](google-oauth-setup.md) - Set up Google Cloud project
2. [emails.md](emails.md) - Email system
3. [signup-signin-sessions-flow.md](signup-signin-sessions-flow.md) - Full flow guide
4. [../02-frontend/single-session.md](../02-frontend/single-session.md) - Session enforcement

## Related

- [../03-convex/setup.md](../03-convex/setup.md) - Convex setup (do first)
- [../02-frontend/modals.md](../02-frontend/modals.md) - Modal patterns