---
last_updated: 2026-01-31
updated_by: vector-projector
change: "Added HTTP endpoint rate limiting pattern, updated fileUpload rate to 10/hour"
status: tested
tldr: "Rate limiting Convex endpoints with @convex-dev/rate-limiter to prevent abuse."
topics: [convex, rate-limiting, security, backend]
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
  backerVerify: { kind: "fixed window", rate: 5, period: MINUTE },

  // APP MUTATIONS
  sessionCreate: { kind: "fixed window", rate: 10, period: MINUTE },
  appStateChange: { kind: "fixed window", rate: 10, period: MINUTE },

  // USER CONTENT (token bucket for burst tolerance)
  projectCreate: { kind: "token bucket", rate: 20, period: HOUR, capacity: 5 },
  fileUpload: { kind: "token bucket", rate: 10, period: HOUR, capacity: 5 },
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
| Backer verification | Username | Prevent brute-forcing codes for specific user |

## Usage Pattern

### In Mutations

```typescript
import { rateLimiter } from "./rateLimiter";

export const myMutation = mutation({
  args: { /* ... */ },
  handler: async (ctx, args) => {
    const { ok, retryAfter } = await rateLimiter.limit(ctx, "ruleName", {
      key: userId,
    });
    if (!ok) {
      throw new Error(`Rate limit exceeded. Try again in ${Math.ceil(retryAfter! / 1000)}s`);
    }
    // ... rest of mutation
  },
});
```

### In HTTP Actions

HTTP actions can't call `rateLimiter.limit()` directly. Use an internal mutation:

```typescript
// convex/uploads.ts
export const checkUploadRateLimit = internalMutation({
  args: { authUserId: v.string() },
  handler: async (ctx, args) => {
    const appUser = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", args.authUserId))
      .unique();

    if (!appUser) {
      return { ok: true }; // User not created yet, allow
    }

    const { ok, retryAfter } = await rateLimiter.limit(ctx, "fileUpload", {
      key: appUser._id,
    });

    if (!ok) {
      return { ok: false, retryAfter: Math.ceil(retryAfter! / 1000) };
    }
    return { ok: true };
  },
});
```

```typescript
// convex/http.ts
uploadCors.route({
  path: "/upload",
  method: "POST",
  handler: httpActionGeneric(async (ctx, req) => {
    // ... auth checks ...

    // Rate limit BEFORE writing blob
    const rateLimit = await ctx.runMutation(
      internal.uploads.checkUploadRateLimit,
      { authUserId: session.user.id }
    );
    if (!rateLimit.ok) {
      return new Response(
        JSON.stringify({ error: `Rate limit exceeded. Try again in ${rateLimit.retryAfter}s` }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }

    // ... proceed with upload ...
  }),
});
```

**Key insight:** Rate limit BEFORE expensive operations (writing blobs, sending emails). This prevents abuse even if the operation would fail later.

## Applied To

| Endpoint | File | Rule | Key |
|----------|------|------|-----|
| `ensureAppUser` | `convex/users.ts` | `sessionCreate` | Auth user ID |
| `verifyBacker` | `convex/crowdfundingBackers.ts` | `backerVerify` | Username (lowercase) |
| `/upload` HTTP | `convex/http.ts` | `fileUpload` | App user ID |

## Avoiding Double-Counting

If you have a two-step flow (e.g., upload blob → commit file), rate limit at the FIRST step only:

```
Upload (rate limited) → Commit (no rate limit)
```

Why:
- Can't commit without uploading first
- Rate limiting both = 2 tokens per operation = halved effective rate
- Upload is where storage cost occurs, so that's where to limit

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
- [../04-auth/crowdfunding-mode.md](../04-auth/crowdfunding-mode.md) - Backer verification