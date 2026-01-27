---
last_updated: 2026-01-26
updated_by: vector-projector
change: "Added critical dual-file email pattern documentation with prominent warnings"
status: tested
---

# Email System

Transactional emails using Resend and React Email.

## Strategy: One Domain for All Apps

**Resend Free Tier:** 3,000 emails/month, 1 domain only.

**The Pattern:** All apps send from root domain `weheart.art`:

```
From: Vector Projector <noreply@weheart.art>
From: Tiler Styler <noreply@weheart.art>
```

The display name identifies the app. Subject line reinforces it. Users don't notice or care about the actual email domain.

**Important:** The FROM address (`noreply@weheart.art`) doesn't need a real inbox. Domain verification in Resend allows SENDING from any address on that domain. The inbox (`vectorprojector@weheart.art` in Spaceship) is for RECEIVING support emails - completely separate.

---

## ⚠️ CRITICAL: Dual-File Email Pattern

**Every email template MUST exist in TWO places:**

| Location | Purpose | When Used |
|----------|---------|----------|
| `/emails/*.tsx` | React Email component | Design preview with `npx email dev` |
| `convex/emails.ts` | HTML string template | Runtime sending via Resend |

**Why two files?**
- Convex's Node bundler has issues with React Email imports
- Runtime templates use HTML strings with `{{variable}}` substitution
- Preview templates use React components for a better design experience

**You MUST maintain parity.** If you add `password-reset` to `convex/emails.ts`, you MUST also create `emails/PasswordResetEmail.tsx` (and vice versa).

### Adding a New Email - Checklist

```
□ 1. Create /emails/NewEmail.tsx (React Email component)
□ 2. Preview with `npx email dev` until design is finalized
□ 3. Add template to TEMPLATES object in convex/emails.ts
□ 4. Copy HTML structure, use {{variable}} for dynamic content
□ 5. Verify both files have matching content/styles
```

### Editing an Existing Email - Checklist

```
□ 1. Edit /emails/ExistingEmail.tsx
□ 2. Preview with `npx email dev`
□ 3. When happy, update the matching template in convex/emails.ts
□ 4. Deploy and test with real email
```

### Current Templates

| Template Name | Preview File | Runtime Key |
|---------------|--------------|-------------|
| Verification | `/emails/VerificationEmail.tsx` | `verification` |
| Password Reset | `/emails/PasswordResetEmail.tsx` | `password-reset` |

---

## Setup

### 1. Verify domain in Resend

1. Go to [resend.com](https://resend.com) → Domains
2. Add domain: `weheart.art`
3. Add DNS records as instructed (MX, TXT, DKIM)
4. Wait for verification (usually a few minutes)

### 2. Get API key

1. Resend dashboard → API Keys
2. Create new key
3. Copy (starts with `re_`)

### 3. Set environment variable in Convex

Convex Dashboard → Settings → Environment Variables:

```
RESEND_API_KEY=re_xxxxxxxxx
```

**Important:** After adding, Convex redeploys automatically. Check logs for any errors.

### 4. Install packages

```bash
npm install resend @react-email/components
```

---

## Architecture

```
/emails                           # PREVIEW templates (React Email)
  VerificationEmail.tsx
  PasswordResetEmail.tsx
/convex
  emails.ts                       # RUNTIME templates (HTML strings)
```

**Pattern:** Templates live as HTML strings in the Convex action, NOT as React Email components rendered at runtime. The `/emails` folder is for design/preview only.

---

## Implementation

### convex/emails.ts

```typescript
"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = "Vector Projector <noreply@weheart.art>";

// =============================================================================
// EMAIL TEMPLATES
// IMPORTANT: Every template here MUST have a matching file in /emails/*.tsx
// Use {{variable}} syntax for substitution.
// =============================================================================

const TEMPLATES = {
  verification: {
    subject: "Verify your email",
    html: `
<!DOCTYPE html>
<html>
<head></head>
<body style="background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="margin:0 auto;padding:40px 20px;">
    <div style="background-color:#ffffff;border-radius:8px;padding:32px;text-align:center;">
      <h1 style="color:#18181b;font-size:24px;font-weight:600;margin:0 0 16px;">Verify your email</h1>
      <p style="color:#52525b;font-size:16px;margin:0 0 24px;">Enter this code to verify your email address:</p>
      <p style="background-color:#f4f4f5;border-radius:8px;color:#18181b;display:inline-block;font-size:32px;font-weight:700;letter-spacing:4px;margin:0 0 24px;padding:16px 32px;">{{code}}</p>
      <p style="color:#a1a1aa;font-size:14px;margin:0;">This code expires in 10 minutes.</p>
    </div>
  </div>
</body>
</html>
    `.trim(),
  },
  "password-reset": {
    subject: "Reset your password",
    html: `
<!DOCTYPE html>
<html>
<head></head>
<body style="background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="margin:0 auto;padding:40px 20px;">
    <div style="background-color:#ffffff;border-radius:8px;padding:32px;text-align:center;">
      <h1 style="color:#18181b;font-size:24px;font-weight:600;margin:0 0 16px;">Reset your password</h1>
      <p style="color:#52525b;font-size:16px;margin:0 0 24px;">Enter this code to reset your password:</p>
      <p style="background-color:#f4f4f5;border-radius:8px;color:#18181b;display:inline-block;font-size:32px;font-weight:700;letter-spacing:4px;margin:0 0 24px;padding:16px 32px;">{{code}}</p>
      <p style="color:#a1a1aa;font-size:14px;margin:0;">This code expires in 10 minutes.</p>
      <p style="color:#a1a1aa;font-size:14px;margin:16px 0 0;">If you didn't request this, you can safely ignore this email.</p>
    </div>
  </div>
</body>
</html>
    `.trim(),
  },
} as const;

type TemplateKey = keyof typeof TEMPLATES;

// ... rest of implementation
```

### Integration with Better Auth

In `convex/auth.ts`, the `emailOTP` plugin calls this action:

```typescript
emailOTP({
  otpLength: 6,
  expiresIn: 600, // 10 minutes
  async sendVerificationOTP({ email, otp, type }) {
    const actionCtx = requireActionCtx(ctx);
    // Use different template based on OTP type
    const template = type === "forget-password" ? "password-reset" : "verification";
    await actionCtx.runAction(internal.emails.sendTemplateEmail, {
      to: email,
      template,
      variables: { code: otp },
    });
  },
}),
```

**Important:** This callback is only triggered when the client explicitly calls `authClient.emailOtp.sendVerificationOtp()`. It is NOT triggered automatically by `signUp.email()`. See [better-auth.md](better-auth.md#-critical-two-verification-systems) for details.

---

## React Email Preview Templates

The `/emails` directory contains React Email components for design preview:

```tsx
// emails/VerificationEmail.tsx
import {
  Html, Head, Body, Container, Section, Text, Heading,
} from '@react-email/components'

interface VerificationEmailProps {
  code: string
}

export function VerificationEmail({ code }: VerificationEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={body}>
        <Container style={container}>
          <Section style={section}>
            <Heading style={heading}>Verify your email</Heading>
            <Text style={text}>Enter this code to verify your email address:</Text>
            <Text style={codeStyle}>{code}</Text>
            <Text style={subtext}>This code expires in 10 minutes.</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// Styles (must match convex/emails.ts templates)
const body = {
  backgroundColor: '#f4f4f5',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}
const container = { margin: '0 auto', padding: '40px 20px' }
const section = {
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  padding: '32px',
  textAlign: 'center' as const,
}
const heading = {
  color: '#18181b',
  fontSize: '24px',
  fontWeight: '600',
  margin: '0 0 16px',
}
const text = { color: '#52525b', fontSize: '16px', margin: '0 0 24px' }
const codeStyle = {
  backgroundColor: '#f4f4f5',
  borderRadius: '8px',
  color: '#18181b',
  display: 'inline-block',
  fontSize: '32px',
  fontWeight: '700',
  letterSpacing: '4px',
  margin: '0 0 24px',
  padding: '16px 32px',
}
const subtext = { color: '#a1a1aa', fontSize: '14px', margin: '0' }
```

### Preview emails locally

```bash
npx email dev
```

This opens a browser preview of all templates in `/emails`.

---

## Troubleshooting

### 401 Error in Convex Logs

**Cause:** `RESEND_API_KEY` is missing or invalid.

**Fix:**
1. Check Convex Dashboard → Settings → Environment Variables
2. Ensure `RESEND_API_KEY` exists and starts with `re_`
3. Check for typos (e.g., `RESEND_API_KET` instead of `RESEND_API_KEY`)

### No Emails Sent, No Errors

**Cause:** The email action isn't being called.

**Why:** With Better Auth, the `emailOTP.sendVerificationOTP` callback is only triggered when the client calls `emailOtp.sendVerificationOtp()`. The signup flow does NOT trigger it automatically.

**Fix:** Ensure client code calls `authClient.emailOtp.sendVerificationOtp()` after `signUp.email()` succeeds.

### Email Not Arriving (But No Errors)

**Check:**
1. Spam folder (ALWAYS check this first)
2. Resend dashboard → Emails tab → check delivery status
3. Is the domain verified in Resend?

### "Domain Not Verified" Error

**Fix:** Go to Resend → Domains → verify your domain by adding DNS records.

### Template Mismatch Between Preview and Runtime

**Symptom:** Email looks different in `npx email dev` preview vs. actual sent email.

**Cause:** The `/emails/*.tsx` preview file and `convex/emails.ts` template are out of sync.

**Fix:** After editing a preview template, copy the updated HTML structure to the matching template in `convex/emails.ts`.

---

## Capacity Planning

| Tier | Emails/month | Domains | Cost |
|------|--------------|---------|------|
| Free | 3,000 | 1 | $0 |
| Pro | 50,000 | Unlimited | $20/mo |

**3,000 emails/month covers:**
- ~3,000 email/password signups with verification
- Google OAuth signups = 0 emails
- Password resets as needed

**Upgrade trigger:** Approaching 3k emails/month → Resend Pro

---

## Per-App Customization

Change these per app:

```typescript
// convex/emails.ts
const FROM_EMAIL = "Vector Projector <noreply@weheart.art>";  // App name here
```

All apps share the same domain (`weheart.art`), but the display name identifies which app sent the email.

---

## Related

- [better-auth.md](better-auth.md) - Auth integration
- [testing.md](testing.md) - Testing patterns
- [../../platform/stack.md](../../platform/stack.md) - Platform email strategy
- [Resend docs](https://resend.com/docs)