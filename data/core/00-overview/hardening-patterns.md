---
last_updated: 2026-01-29
updated_by: vector-projector
change: "Added frontmatter metadata - marked as reference type"
status: tested
context_cost: 4KB
type: reference
requires: []
---

# Hardening Patterns

Lessons learned from security audits. **Reference doc - read when hardening, not during initial setup.**

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