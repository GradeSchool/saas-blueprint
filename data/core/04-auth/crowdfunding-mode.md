---
last_updated: 2026-01-28
updated_by: vector-projector
change: "Added claim token pattern, username normalization, server-side enforcement"
status: tested
tldr: "During crowdfunding, only verified MakerWorld backers can sign up."
topics: [auth, crowdfunding, signup, backers]
---

# Crowdfunding Mode

During crowdfunding, only MakerWorld backers can sign up. Regular sign up is disabled.

## How It Works

### app_state.crowdfundingActive

When `true`:
- Sign Up modal shows backer verification form (MakerWorld username + access code)
- Regular email/password and Google sign up disabled until backer verified
- **Server-side enforcement**: `ensureAppUser` requires a valid backer claim token
- Crowdfunding banners shown on FAQ/Pricing pages
- Onboarding modal shows crowdfunding messaging

When `false`:
- Normal sign up flow (email/password or Google)
- No crowdfunding messaging

## Security Hardening

### Server-Side Enforcement

The backend enforces crowdfunding rules - client-side checks alone are not sufficient:

```typescript
// In ensureAppUser mutation
const requiresBacker = crowdfundingActive;
if (requiresBacker && !args.crowdfundingBackerId) {
  throw new Error("Backer verification is required during crowdfunding");
}
```

This prevents direct API calls from bypassing the backer requirement.

### Claim Token Pattern

Backer verification issues a short-lived claim token (10 minutes). This prevents:
- Reusing old verification results after abandoning signup
- Sharing verification between users
- Replay attacks

```typescript
// In verifyBacker - issue claim token
const pendingClaimToken = crypto.randomUUID();
const pendingClaimExpiresAt = Date.now() + CLAIM_TOKEN_TTL_MS; // 10 min

await ctx.db.patch(backer._id, {
  pendingClaimToken,
  pendingClaimExpiresAt,
});

return {
  valid: true,
  backerId: backer._id,
  tier: backer.tier,
  claimToken: pendingClaimToken,
  claimExpiresAt: pendingClaimExpiresAt,
};
```

```typescript
// In ensureAppUser - validate claim token
if (args.crowdfundingBackerId) {
  if (!args.crowdfundingBackerToken) {
    throw new Error("Backer verification token is required");
  }
  const backer = await ctx.db.get(args.crowdfundingBackerId);
  if (!backer.pendingClaimToken || !backer.pendingClaimExpiresAt) {
    throw new Error("Backer verification expired. Please verify again.");
  }
  if (backer.pendingClaimToken !== args.crowdfundingBackerToken) {
    throw new Error("Backer verification does not match.");
  }
  if (backer.pendingClaimExpiresAt < Date.now()) {
    throw new Error("Backer verification expired. Please verify again.");
  }
}
```

### Username Normalization

Usernames are case-insensitive for lookups but original casing is preserved:

```typescript
// Schema includes both fields
username: v.string(),         // Original casing for display
usernameLower: v.optional(v.string()), // Lowercase for lookups

// Index on lowercase
.index("by_usernameLower_code", ["usernameLower", "accessCode"])
```

Lookup logic:
1. Try `by_usernameLower_code` index first (new records)
2. Fall back to `by_username_code` index (transition period)
3. Fall back to full scan with lowercase compare (legacy records)
4. Normalize legacy records on first successful match

```typescript
const normalizeUsername = (username: string) => username.trim();
const normalizeUsernameLower = (username: string) => 
  normalizeUsername(username).toLowerCase();

// Normalize legacy record on successful match
if (backer.usernameLower !== usernameLower) {
  await ctx.db.patch(backer._id, {
    username: normalizedUsername,
    usernameLower,
  });
}
```

### addBacker is Internal Only

`addBacker` is an `internalMutation`, not a public `mutation`. This means:
- Cannot be called from client/browser
- Can only be called from other Convex functions or CLI
- Prevents malicious users from adding themselves as backers

**Add backers via CLI:** `npx convex run crowdfundingBackers:addBacker '{...}'`

### verifyBacker is Rate Limited

Prevents brute-forcing access codes:
- 5 attempts per minute per username (normalized to lowercase)
- Returns `rate_limited` reason with retry time
- UI shows friendly error message

### CORS Restricted

Auth HTTP routes only accept requests from allowed origins.

## Database Schema

### crowdfunding_backers Table

```typescript
crowdfunding_backers: defineTable({
  username: v.string(),           // MakerWorld username (original casing)
  usernameLower: v.optional(v.string()), // Normalized for lookups
  accessCode: v.string(),         // Verification code
  tier: v.string(),               // Backer tier (affects future billing)
  usedByUserId: v.optional(v.id("users")),   // Links to user who claimed it
  usedAt: v.optional(v.number()),            // When it was claimed
  pendingClaimToken: v.optional(v.string()), // Short-lived verification token
  pendingClaimExpiresAt: v.optional(v.number()), // Token expiry
})
  .index("by_username_code", ["username", "accessCode"])
  .index("by_usernameLower_code", ["usernameLower", "accessCode"])
  .index("by_usedByUserId", ["usedByUserId"])
```

### users Table Addition

```typescript
crowdfundingBackerId: v.optional(v.id("crowdfunding_backers"))
```

## Sign Up Flow

### Step 1: Backer Verification

1. User clicks "Sign Up" during crowdfunding
2. Modal shows backer verification form
3. User enters MakerWorld username + access code
4. `verifyBacker` mutation:
   - Rate limits by normalized username
   - Looks up backer (case-insensitive)
   - Issues claim token (10 min TTL)
5. Client stores `backerId` and `claimToken` in state

### Step 2: Account Creation

1. User chooses Google OAuth or email/password
2. On account creation, `ensureAppUser` receives `crowdfundingBackerId` and `crowdfundingBackerToken`
3. Backend validates:
   - Backer exists and is unused
   - Claim token matches
   - Claim token not expired
4. User record created with `crowdfundingBackerId`
5. Backer record marked as used, claim token cleared

### Google OAuth Flow

For Google sign up, both backerId and claimToken must survive the OAuth redirect:

```typescript
// Before OAuth redirect (AuthModal.tsx)
if (verifiedBackerId && verifiedBackerToken) {
  safeSessionSet(BACKER_ID_KEY, verifiedBackerId);
  safeSessionSet(BACKER_TOKEN_KEY, verifiedBackerToken);
}
await authClient.signIn.social({ provider: 'google' });

// After OAuth return (App.tsx)
const storedBackerId = safeSessionGet(BACKER_ID_KEY);
const storedBackerToken = safeSessionGet(BACKER_TOKEN_KEY);
await ensureAppUser({ 
  crowdfundingBackerId: storedBackerId,
  crowdfundingBackerToken: storedBackerToken,
});
safeSessionRemove(BACKER_ID_KEY);
safeSessionRemove(BACKER_TOKEN_KEY);
```

## Files

- `convex/schema.ts` - `crowdfunding_backers` table, `crowdfundingBackerId` on users
- `convex/crowdfundingBackers.ts` - `verifyBacker` (public), `addBacker` (internal)
- `convex/users.ts` - `ensureAppUser` validates claim token
- `convex/http.ts` - CORS configuration
- `src/components/modals/AuthModal.tsx` - Two-step backer verification UI
- `src/App.tsx` - Retrieves backerId/token from sessionStorage after OAuth

## Related

- [../03-convex/schema.md](../03-convex/schema.md) - Database schema
- [../03-convex/rate-limiting.md](../03-convex/rate-limiting.md) - Rate limiting rules
- [better-auth.md](better-auth.md) - Normal auth setup
- [signup-signin-sessions-flow.md](signup-signin-sessions-flow.md) - Auth flows
