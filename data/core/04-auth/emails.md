---
last_updated: 2026-01-24
updated_by: vector-projector
change: "Initial email system documentation"
status: tested
---

# Email System

Transactional emails using Resend and React Email.

## Architecture

```
/emails
  VerificationEmail.tsx   # React Email - for design/preview
  WelcomeEmail.tsx        # React Email - for design/preview
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

### 2. Set environment variable

In Convex dashboard:

```
RESEND_API_KEY=re_xxxxxxxxx
```

### 3. Create email action

`convex/emails.ts`:

```typescript
"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = "App Name <noreply@yourdomain.com>";

const TEMPLATES = {
  verification: {
    subject: "Verify your email",
    html: `<!-- HTML here with {{code}} placeholder -->`,
  },
  welcome: {
    subject: "Welcome to App Name",
    html: `<!-- HTML here with {{name}} placeholder -->`,
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
}

export function VerificationEmail({ code }: Props) {
  return (
    <Html>
      <Body style={body}>
        <Container style={container}>
          <Heading>Verify your email</Heading>
          <Text>Your code: {code}</Text>
        </Container>
      </Body>
    </Html>
  )
}

const body = { backgroundColor: '#f4f4f5', fontFamily: 'sans-serif' }
const container = { backgroundColor: '#fff', padding: '32px', borderRadius: '8px' }
```

### Preview emails locally

```bash
npx email dev
```

Opens browser preview at localhost:3000.

### Export to HTML

```typescript
import { render } from '@react-email/render'
import { VerificationEmail } from './emails/VerificationEmail'

const html = await render(VerificationEmail({ code: '123456' }))
console.log(html) // Copy this to TEMPLATES in convex/emails.ts
```

## Calling from Convex

```typescript
// From a mutation/action:
await ctx.runAction(internal.emails.sendTemplateEmail, {
  to: "user@example.com",
  template: "verification",
  variables: { code: "123456" },
});

// Or schedule for later:
await ctx.scheduler.runAfter(0, internal.emails.sendTemplateEmail, {
  to: "user@example.com",
  template: "welcome",
  variables: { name: "John" },
});
```

## Template Variables

Use `{{variableName}}` syntax in HTML:

```html
<p>Hello {{name}}, your code is {{code}}</p>
```

Pass variables when sending:

```typescript
variables: { name: "John", code: "123456" }
```

## Adding New Templates

1. Create React Email component in `/emails` for design
2. Preview with `npx email dev`
3. Render to HTML, copy to `TEMPLATES` in `convex/emails.ts`
4. Add any new variables

## Resend Setup

1. Create account at [resend.com](https://resend.com)
2. Add and verify your domain
3. Create API key
4. Add `RESEND_API_KEY` to Convex environment variables
5. Update `FROM_EMAIL` in `convex/emails.ts`

## Related

- [../04-auth/better-auth.md](../04-auth/better-auth.md) - Auth integration
- [Resend docs](https://resend.com/docs)
- [React Email docs](https://react.email/docs)