---
last_updated: 2026-01-24
updated_by: vector-projector
change: "Updated with weheart.art email pattern for free tier"
status: planned
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

## Architecture

```
/emails
  VerificationEmail.tsx   # React Email - for design/preview
  WelcomeEmail.tsx        # React Email - for design/preview (optional)
/convex
  emails.ts               # "use node" action with HTML templates
```

**Pattern:** Templates live in code as React Email components (for design/preview), but the "runtime" version is an HTML string in the Convex action.

**Why not render React Email in Convex?** Convex's Node bundler has issues with React Email imports. Simpler to use HTML strings with variable substitution.

## Setup

### 1. Install packages

```bash
npm install resend @react-email/components @react-email/render
```

### 2. Verify domain in Resend

1. Go to [resend.com](https://resend.com)
2. Add domain: `weheart.art`
3. Add DNS records as instructed
4. Wait for verification

### 3. Set environment variable

In Convex dashboard → Settings → Environment Variables:

```
RESEND_API_KEY=re_xxxxxxxxx
```

### 4. Create email action

`convex/emails.ts`:

```typescript
"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// App name - change per app
const APP_NAME = "Vector Projector";
const FROM_EMAIL = `${APP_NAME} <noreply@weheart.art>`;

const TEMPLATES = {
  verification: {
    subject: `Verify your ${APP_NAME} account`,
    html: `
<!DOCTYPE html>
<html>
<body style="background-color:#f4f4f5;font-family:sans-serif;">
  <div style="margin:0 auto;padding:40px 20px;">
    <div style="background:#fff;border-radius:8px;padding:32px;text-align:center;">
      <h1 style="color:#18181b;font-size:24px;">Verify your email</h1>
      <p style="color:#52525b;">Enter this code to verify your ${APP_NAME} account:</p>
      <p style="font-size:32px;font-weight:bold;letter-spacing:4px;background:#f4f4f5;padding:16px 32px;border-radius:8px;display:inline-block;">{{code}}</p>
      <p style="color:#a1a1aa;font-size:14px;">This code expires in 10 minutes.</p>
    </div>
  </div>
</body>
</html>
    `.trim(),
  },
} as const;

type TemplateKey = keyof typeof TEMPLATES;

export const sendTemplateEmail = internalAction({
  args: {
    to: v.string(),
    template: v.string(),
    variables: v.record(v.string(), v.string()),
  },
  handler: async (_ctx, { to, template, variables }) => {
    const tmpl = TEMPLATES[template as TemplateKey];
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

## React Email Templates

Create templates in `/emails` for design and preview:

```tsx
// emails/VerificationEmail.tsx
import { Html, Body, Container, Text, Heading } from '@react-email/components'

interface Props {
  code: string
  appName: string
}

export function VerificationEmail({ code, appName }: Props) {
  return (
    <Html>
      <Body style={body}>
        <Container style={container}>
          <Heading>Verify your email</Heading>
          <Text>Enter this code to verify your {appName} account:</Text>
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

### Export to HTML

```typescript
import { render } from '@react-email/render'
import { VerificationEmail } from './emails/VerificationEmail'

const html = await render(VerificationEmail({ code: '123456', appName: 'Vector Projector' }))
console.log(html) // Copy to TEMPLATES in convex/emails.ts
```

## Adding New Templates

1. Create React Email component in `/emails`
2. Preview with `npx email dev`
3. Render to HTML, copy to `TEMPLATES` in `convex/emails.ts`
4. Add any new variables

## Capacity Planning

| Tier | Emails/month | Domains | Cost |
|------|--------------|---------|------|
| Free | 3,000 | 1 | $0 |
| Pro | 50,000 | Unlimited | $20/mo |

**3,000 emails/month covers:**
- ~3,000 email/password signups
- Google OAuth signups = 0 emails
- Password resets as needed

**Upgrade trigger:** Approaching 3k emails/month → Resend Pro

## Related

- [better-auth.md](better-auth.md) - Auth integration
- [../../platform/stack.md](../../platform/stack.md) - Platform email strategy
- [Resend docs](https://resend.com/docs)