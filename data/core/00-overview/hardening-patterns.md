---
last_updated: 2026-01-31
updated_by: vector-projector
change: "Added Opportunistic Cleanup pattern for expiring records"
status: tested
context_cost: 6KB
type: reference
requires: []
tldr: "Security audit lessons: CSP, rate limiting, input validation. Read when hardening."
topics: [security, hardening, csp, rate-limiting, reference]
---

# Hardening Patterns

Lessons learned from security audits. **Reference doc - read when hardening, not during initial setup.**

---

## Content Security Policy (CSP)

**Problem**: XSS attacks can execute arbitrary JavaScript, stealing tokens from localStorage.

**Solution**: CSP headers restrict what resources can load, blocking injected scripts.

```json
// vercel.json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.convex.site; connect-src 'self' https://*.convex.cloud wss://*.convex.cloud https://*.convex.site https://accounts.google.com; frame-src https://accounts.google.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://*.convex.site https://accounts.google.com; upgrade-insecure-requests"
        }
      ]
    }
  ]
}
```

**Key directives:**

| Directive | Value | Purpose |
|-----------|-------|--------|
| `script-src` | `'self'` | Only scripts from your domain (blocks injected scripts) |
| `connect-src` | Convex + Google | Whitelist API connections |
| `frame-ancestors` | `'none'` | Prevent clickjacking |
| `form-action` | Known endpoints | Restrict form submissions |

**Additional security headers:**

```json
{ "key": "X-Content-Type-Options", "value": "nosniff" },
{ "key": "X-Frame-Options", "value": "DENY" },
{ "key": "X-XSS-Protection", "value": "1; mode=block" },
{ "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
{ "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=(), payment=()" }
```

**Note**: CSP only applies in production (Vercel). Vite dev mode needs looser settings for HMR.

---

## Opportunistic Cleanup (No Cron)

**Problem**: Expiring records (pending uploads, tokens, etc.) accumulate from inactive users.

**Solution**: Clean up ALL expired records on every related operation, not just the current user's.

```typescript
// BAD - only cleans current user's expired records
const userRecords = await ctx.db
  .query("pending_uploads")
  .withIndex("by_userId", (q) => q.eq("userId", args.userId))
  .collect();
for (const r of userRecords) {
  if (r.expiresAt < now) await ctx.db.delete(r._id);
}

// GOOD - cleans ALL expired records
const expired = await ctx.db
  .query("pending_uploads")
  .withIndex("by_expiresAt")
  .filter((q) => q.lt(q.field("expiresAt"), now))
  .collect();
for (const r of expired) {
  await ctx.db.delete(r._id);
}
```

**Benefits:**
- No cron job complexity
- Inactive users' records get cleaned by active users
- As long as someone uses the feature, cleanup happens

**Requires:** Index on `expiresAt` field for efficient queries.

---

## Server-Side Enforcement

**Problem**: Client-side checks can be bypassed.

```typescript
// GOOD - server enforces
export const ensureAppUser = mutation({
  handler: async (ctx, args) => {
    const config = await getAppState(ctx);
    if (config.crowdfundingActive && !args.crowdfundingBackerId) {
      throw new Error("Backer verification is required");
    }
  },
});
```

---

## Short-Lived Claim Tokens

**Problem**: Verification results can be reused or shared.

```typescript
const CLAIM_TOKEN_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Issue token on verification
const pendingClaimToken = crypto.randomUUID();
const pendingClaimExpiresAt = Date.now() + CLAIM_TOKEN_TTL_MS;
await ctx.db.patch(record._id, { pendingClaimToken, pendingClaimExpiresAt });

// Validate on completion
if (record.pendingClaimToken !== args.claimToken) throw new Error("Mismatch");
if (record.pendingClaimExpiresAt < Date.now()) throw new Error("Expired");
```

---

## Case-Insensitive Lookups

**Problem**: Usernames with different casing bypass rate limits.

```typescript
// Schema
username: v.string(),              // Original casing
usernameLower: v.optional(v.string()), // Normalized

// Lookup
const usernameLower = username.trim().toLowerCase();
await ctx.db.query("table")
  .withIndex("by_usernameLower", (q) => q.eq("usernameLower", usernameLower))
  .unique();
```

---

## Singleton Pattern for Config

**Problem**: Multiple config rows cause inconsistent behavior.

```typescript
const pickLatestByCreation = <T extends { _creationTime: number }>(records: T[]) =>
  records.reduce((latest, record) =>
    record._creationTime > latest._creationTime ? record : latest
  );

// Read: pick newest
const states = await ctx.db.query("app_state").withIndex("by_key").collect();
const config = states.length > 0 ? pickLatestByCreation(states) : null;

// Write: update newest, delete duplicates
```

---

## Session ID Validation

**Problem**: Invalid session IDs cause unnecessary server calls.

```typescript
const SESSION_ID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

if (!SESSION_ID_REGEX.test(sessionId)) {
  return { valid: false, reason: "invalid_session_id" };
}
```

---

## Deterministic Duplicate Tab Detection

**Problem**: Both tabs mark as duplicates.

```typescript
const isDuplicateFor = (otherOpenedAt: number, otherTabId: string) => {
  if (otherOpenedAt < tabOpenedAt.current) return true;  // Other is older
  if (otherOpenedAt > tabOpenedAt.current) return false; // We are older
  return otherTabId.localeCompare(tabId.current) < 0;    // Tiebreaker
};
```

---

## Sign-Out Race Condition

**Problem**: Queries throw during sign-out.

```typescript
let authUser;
try {
  authUser = await authComponent.getAuthUser(ctx);
} catch {
  return false; // Graceful fallback
}
```

---

## User-Visible Auth Errors

**Problem**: Silent failures leave users stuck.

```typescript
const [ensureUserError, setEnsureUserError] = useState<string | null>(null);

ensureAppUser(args).catch((err) => setEnsureUserError(err.message));

if (ensureUserError) return <ErrorScreen onRetry={...} />;
```

---

## Environment Variable Validation

**Problem**: Missing env vars cause cryptic errors.

```typescript
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing: ${name}`);
  return value;
}
```

---

## React Error Boundary

**Problem**: One error crashes entire SPA.

```tsx
export class ErrorBoundary extends Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return <FallbackUI />;
    return this.props.children;
  }
}
```

---

## Related

- [../04-auth/crowdfunding-mode.md](../04-auth/crowdfunding-mode.md) - Claim token example
- [../02-frontend/single-session.md](../02-frontend/single-session.md) - Session validation