---
last_updated: 2026-01-26
updated_by: vector-projector
change: "Updated with working Resend configuration and troubleshooting from real testing"
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
/emails
  VerificationEmail.tsx   # React Email - for design/preview only
/convex
  emails.ts               # "use node" action with HTML templates
```

**Pattern:** Templates live as HTML strings in the Convex action, NOT as React Email components rendered at runtime.

**Why not render React Email in Convex?** Convex's Node bundler has issues with React Email imports. Simpler to use HTML strings with `{{variable}}` substitution.

---

## Implementation (Working Code)

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
} as const;

type TemplateKey = keyof typeof TEMPLATES;

// =============================================================================
// ACTIONS
// =============================================================================

// Generic send - receives pre-rendered HTML
export const sendEmail = internalAction({
  args: {
    to: v.string(),
    subject: v.string(),
    html: v.string(),
  },
  handler: async (_ctx, { to, subject, html }) => {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });

    if (error) {
      console.error("Failed to send email:", error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    return { success: true, messageId: data?.id };
  },
});

// Send using a template - handles variable substitution
export const sendTemplateEmail = internalAction({
  args: {
    to: v.string(),
    template: v.string(),
    variables: v.record(v.string(), v.string()),
  },
  handler: async (_ctx, { to, template, variables }) => {
    const tmpl = TEMPLATES[template as TemplateKey];
    if (!tmpl) {
      throw new Error(`Unknown email template: ${template}`);
    }

    // Substitute variables
    let html = tmpl.html;
    let subject = tmpl.subject;
    for (const [key, value] of Object.entries(variables)) {
      html = html.replaceAll(`{{${key}}}`, value);
      subject = subject.replaceAll(`{{${key}}}`, value);
    }

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });

    if (error) {
      console.error("Failed to send email:", error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    return { success: true, messageId: data?.id };
  },
});
```

### Integration with Better Auth

In `convex/auth.ts`, the `emailOTP` plugin calls this action:

```typescript
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
```

**Important:** This callback is only triggered when the client explicitly calls `authClient.emailOtp.sendVerificationOtp()`. It is NOT triggered automatically by `signUp.email()`. See [better-auth.md](better-auth.md#-critical-two-verification-systems) for details.

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
1. Spam folder
2. Resend dashboard → Emails tab → check delivery status
3. Is the domain verified in Resend?

### "Domain Not Verified" Error

**Fix:** Go to Resend → Domains → verify your domain by adding DNS records.

---

## React Email Templates (Optional)

For designing emails, create React Email components in `/emails`. These are for **preview only** - not used at runtime.

```tsx
// emails/VerificationEmail.tsx
import { Html, Body, Container, Text, Heading } from '@react-email/components'

interface Props {
  code: string
}

export function VerificationEmail({ code }: Props) {
  return (
    <Html>
      <Body style={body}>
        <Container style={container}>
          <Heading>Verify your email</Heading>
          <Text>Enter this code to verify your email address:</Text>
          <Text style={codeStyle}>{code}</Text>
          <Text style={subtext}>This code expires in 10 minutes.</Text>
        </Container>
      </Body>
    </Html>
  )
}

const body = { backgroundColor: '#f4f4f5', fontFamily: 'sans-serif' }
const container = { backgroundColor: '#fff', padding: '32px', borderRadius: '8px', textAlign: 'center' as const }
const codeStyle = { fontSize: '32px', fontWeight: 'bold', letterSpacing: '4px' }
const subtext = { color: '#a1a1aa', fontSize: '14px' }
```

### Preview emails locally

```bash
npx email dev
```

### Workflow for New Templates

1. Create React Email component in `/emails`
2. Preview with `npx email dev`
3. When happy, manually copy the HTML structure to `TEMPLATES` in `convex/emails.ts`
4. Use `{{variable}}` syntax for dynamic content

---

## Adding New Templates

1. Add to `TEMPLATES` object in `convex/emails.ts`
2. Define `subject` and `html` with `{{variable}}` placeholders
3. Call via `internal.emails.sendTemplateEmail` with template name and variables

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