---
last_updated: 2026-01-27
updated_by: vector-projector
change: "Added actual implementation patterns and rules"
status: partial
---

# Rate Limiting

Protecting Convex endpoints from abuse using `@convex-dev/rate-limiter`.

## Setup

```bash
npm install @convex-dev/rate-limiter
```

```typescript
// convex/convex.config.ts
import { defineApp } from "convex/server";
import betterAuth from "@convex-dev/better-auth/convex.config";
import rateLimiter from "@convex-dev/rate-limiter/convex.config";

const app = defineApp();
app.use(betterAuth);
app.use(rateLimiter);
export default app;
```

## Rate Limiter Configuration

```typescript
// convex/rateLimiter.ts
import { RateLimiter, MINUTE, HOUR } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";

export const rateLimiter = new RateLimiter(components.rateLimiter, {
  // AUTH - CRITICAL
  otpVerify: { kind: "fixed window", rate: 5, period: MINUTE },
  otpSend: { kind: "fixed window", rate: 3, period: HOUR },
  passwordReset: { kind: "fixed window", rate: 3, period: HOUR },
  signUp: { kind: "fixed window", rate: 10, period: HOUR },
  signIn: { kind: "fixed window", rate: 20, period: MINUTE },

  // APP MUTATIONS
  sessionCreate: { kind: "fixed window", rate: 10, period: MINUTE },
  appStateChange: { kind: "fixed window", rate: 10, period: MINUTE },

  // USER CONTENT (token bucket for burst tolerance)
  projectCreate: { kind: "token bucket", rate: 20, period: HOUR, capacity: 5 },
  fileUpload: { kind: "token bucket", rate: 50, period: HOUR, capacity: 10 },
});
```

## Algorithm Choice

| Type | Algorithm | Why |
|------|-----------|-----|
| Security endpoints | Fixed window | Simple, predictable, boundary burst not critical |
| User content | Token bucket | Allows legitimate bursts (creating several projects) |

## Key Strategy

| Situation | Key | Why |
|-----------|-----|-----|
| Unauthenticated | IP | Only identifier available |
| Authenticated | User ID | Don't punish shared IPs (offices, VPNs) |
| Email operations | Target email | Prevent spam to one inbox |

## Usage Pattern

```typescript
import { rateLimiter } from "./rateLimiter";

export const myMutation = mutation({
  args: { /* ... */ },
  handler: async (ctx, args) => {
    // Check rate limit (throws on failure)
    const { ok, retryAfter } = await rateLimiter.limit(ctx, "ruleName", {
      key: userId, // or ip, or email
    });
    if (!ok) {
      throw new Error(`Rate limit exceeded. Try again in ${Math.ceil(retryAfter! / 1000)} seconds.`);
    }

    // ... rest of mutation
  },
});
```

## Applied To

| Endpoint | File | Rule | Key |
|----------|------|------|-----|
| `ensureAppUser` | `convex/users.ts` | `sessionCreate` | Auth user ID |

## Not Yet Applied

Better Auth endpoints (sign up, sign in, OTP) are HTTP routes registered by the component. Options:

1. **Vercel Edge Middleware** - Rate limit at edge before hitting Convex
2. **Wrap HTTP routes** - Custom HTTP handlers that add rate limiting
3. **Better Auth plugins** - Check if rate limiting plugin exists

For now, Vercel bot protection + edge middleware is the recommended first line of defense for auth endpoints.

## Compliance (GDPR)

IP-based rate limiting does NOT require cookie consent:

- Falls under "legitimate interest" exemption
- Security measures don't require consent
- Data is ephemeral (counters expire)
- Not tracking across sites

Should have: Privacy policy mentioning IP processing for security.

## Related

- [schema.md](schema.md) - Database schema
- [../04-auth/better-auth.md](../04-auth/better-auth.md) - Auth setup