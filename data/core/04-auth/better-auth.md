---
last_updated: 2026-01-24
updated_by: vector-projector
change: "Complete email verification flow with Resend"
status: tested
---

# Better Auth

Authentication with Better Auth and Convex. Email/password with email verification.

## Why No OAuth?

These SaaS apps don't use Google/GitHub OAuth because:

1. **No separate Google accounts yet** - Each app would need its own Google Cloud project and OAuth credentials. That setup hasn't been done.
2. **Future consideration** - When/if individual apps need OAuth, it can be added per-app. Better Auth supports it.
3. **Email/password is sufficient** - For MVP and initial users, email auth works fine.

This decision may be revisited as the app portfolio grows.

## Prerequisites

- Convex set up and running (see [../03-convex/setup.md](../03-convex/setup.md))
- `npx convex dev` running in terminal
- Resend account with verified domain
- `RESEND_API_KEY` set in Convex dashboard environment variables

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
  auth.ts                 # Main auth setup with emailOTP
  emails.ts               # Email sending action (use node)
  http.ts                 # Auth HTTP routes
/src/lib
  auth-client.ts          # Client-side auth with emailOTP plugin
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

```typescript
"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = "App Name <noreply@yourdomain.com>";

// HTML templates with {{variable}} placeholders
const TEMPLATES = {
  verification: {
    subject: "Verify your email",
    html: `
<!DOCTYPE html>
<html>
<body style="background-color:#f4f4f5;font-family:sans-serif;">
  <div style="margin:0 auto;padding:40px 20px;">
    <div style="background:#fff;border-radius:8px;padding:32px;text-align:center;">
      <h1>Verify your email</h1>
      <p>Enter this code:</p>
      <p style="font-size:32px;font-weight:bold;letter-spacing:4px;">{{code}}</p>
      <p style="color:#888;">Expires in 10 minutes.</p>
    </div>
  </div>
</body>
</html>
    `.trim(),
  },
} as const;

export const sendTemplateEmail = internalAction({
  args: {
    to: v.string(),
    template: v.string(),
    variables: v.record(v.string(), v.string()),
  },
  handler: async (_ctx, { to, template, variables }) => {
    const tmpl = TEMPLATES[template as keyof typeof TEMPLATES];
    if (!tmpl) throw new Error(`Unknown template: ${template}`);

    let html = tmpl.html;
    let subject = tmpl.subject;
    for (const [key, value] of Object.entries(variables)) {
      html = html.replaceAll(`{{${key}}}`, value);
      subject = subject.replaceAll(`{{${key}}}`, value);
    }

    const { error } = await resend.emails.send({ from: FROM_EMAIL, to, subject, html });
    if (error) throw new Error(`Failed to send: ${error.message}`);
  },
});
```

**Email Template Pattern:**
- `/emails` folder has React Email components for designing/previewing
- Convex action has HTML as string with `{{variable}}` placeholders
- To update: render React Email locally, copy HTML to Convex

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

## Frontend Auth Flow

### Header Buttons

- **Signed out:** Show "Sign Up" and "Sign In" buttons
- **Signed in:** Show "User" button

### Sign Up Flow (with verification)

1. User enters email/password/name → submits
2. Account created, verification email sent
3. Modal shows code input
4. User enters 6-digit code → verified → logged in

### Sign In Flow

1. User enters email/password → submits
2. If valid → logged in, modal closes
3. If invalid → show error

### AuthModal Pattern

```tsx
type Step = 'form' | 'verify'

export function AuthModal({ isOpen, onClose, mode }: AuthModalProps) {
  const [step, setStep] = useState<Step>('form')
  
  // On signup success:
  setStep('verify')
  
  // Verify code:
  await authClient.emailOtp.verifyEmail({ email, otp: code })
  
  // Resend code:
  await authClient.emailOtp.sendVerificationOtp({ email, type: 'email-verification' })
}
```

## Sign Out

Add to UserPage:

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
| React Email won't render in Convex | Use HTML string templates in Convex, React Email for design only |

## Environment Variables (Convex Dashboard)

```
RESEND_API_KEY=re_xxxxxxxxx
```

## Next Steps

- [../02-frontend/modals.md](../02-frontend/modals.md) - Auth modal pattern
- Add password reset flow (optional)
- Add OAuth providers (optional, per-app)

## Related

- [../03-convex/setup.md](../03-convex/setup.md) - Convex setup (do first)
- [../02-frontend/modals.md](../02-frontend/modals.md) - Modal patterns
- [emails.md](emails.md) - Email system details