---
last_updated: 2026-01-27
updated_by: vector-projector
change: "Marked session enforcement as implemented"
status: tested
---

# Sign Up / Sign In / Sessions Flow

Plain-English guide covering all scenarios. Use this as a testing checklist.

---

## Two-Table Architecture

**Better Auth** manages authentication (credentials, sessions, OAuth). **App tables** store application-specific data.

| Table | Managed By | Purpose |
|-------|------------|--------|
| `betterAuth:user` | Better Auth | Email, name, emailVerified, OAuth links |
| `betterAuth:session` | Better Auth | Auth sessions, tokens, expiry |
| `users` | App | App-specific data (subscriptions, preferences) |
| `admins` | App | Admin whitelist (emails) |

**Why two user tables?**
- Separation of concerns - auth vs app data
- Future-proofing - can migrate away from Better Auth
- App data like subscription status, usage quotas, etc.

**Linking:** App `users` table has `authUserId` field that references Better Auth user's `_id`.

---

## App User Creation

**When:** On every sign-in, check if app user exists. Create if not.

**Why this approach:**
- Single code path for both email and Google OAuth
- Handles edge cases (user signed up but app user wasn't created)
- Simple and reliable

**Implementation:** `ensureAppUser` mutation in `convex/users.ts`

```typescript
// Called after every successful sign-in
const result = await ensureAppUser()
// Returns: { userId, email, name, isAdmin, sessionId }
```

**For Google OAuth:** App.tsx has a useEffect that calls `ensureAppUser` when user is authenticated but no app user exists (handles the redirect return).

---

## Admin System

**Approach:** Separate `admins` table with whitelisted emails.

**Schema:**
```typescript
admins: defineTable({
  email: v.string(),
  addedAt: v.number(),
  note: v.optional(v.string()),
}).index("by_email", ["email"])
```

**How it works:**
1. Manually add email to `admins` table in Convex dashboard
2. User signs up/in normally (email or Google)
3. On sign-in, `ensureAppUser` checks if email is in admins table
4. Returns `isAdmin: true` if found
5. App routes admin to AdminPage instead of UserPage

**Admin is NOT a special account type.** They have a normal account, but their email is whitelisted.

**Adding an admin:**
```json
// In Convex dashboard > Data > admins > Add document
{
  "email": "admin@example.com",
  "addedAt": 1706400000000,
  "note": "Founder"
}
```

---

## Auth Methods Summary

| Method | New User | Existing User | Auto Sign-In |
|--------|----------|---------------|-------------|
| **Google OAuth** | Auto-creates account, logged in | Logged in | YES |
| **Email/Password** | Must sign up, verify email | Must sign in | NO - manual after verify |

**Key insight:** Google OAuth has no sign up vs sign in distinction. "Continue with Google" works for both. Email/password requires explicit steps.

---

## Password Requirements

**All passwords must meet these requirements:**

| Requirement | Rule |
|-------------|------|
| Length | At least 12 characters |
| Uppercase | At least one A-Z |
| Lowercase | At least one a-z |
| Number | At least one 0-9 |
| Special | At least one !@#$%^&*()_+-=[]{}\|;':",./<>? |

**Example valid password:** `MyP@ssw0rd123`

**UI Helper Text:** "12+ chars, uppercase, lowercase, number, special"

**Error Messages:** Show exactly what's missing, e.g., "Missing: uppercase, number"

---

## Session Enforcement

**Status: Implemented**

| Rule | Implementation |
|------|----------------|
| One session per user | `activeSessionId` field on users table |
| One tab per browser | BroadcastChannel API |
| No exceptions | Admins follow same rules |

**Cross-device:** New sign-in generates new `activeSessionId`, invalidating previous. Convex reactive query detects mismatch and shows "Session Ended" screen.

**Same browser:** BroadcastChannel messages detect duplicate tabs. Second tab shows "Duplicate Tab" warning.

See [../02-frontend/single-session.md](../02-frontend/single-session.md) for implementation details.

---

## UI Pattern: Spam Folder Callout

**CRITICAL:** Every modal/screen where an email was sent MUST include:

```
┌─────────────────────────────────────────────┐
│  📧 Check your spam folder if you don't    │
│     see the email in your inbox.            │
└─────────────────────────────────────────────┘
```

---

## Google OAuth Flow

**Works the same for new and existing users.**

### Happy Path

```
1. User clicks "Sign Up" or "Sign In"
2. Modal opens, user clicks "Continue with Google"
3. Redirect to Google consent screen
4. User approves
5. Redirect back to app
6. If no Better Auth account exists → created automatically
7. User authenticated (email verified by Google)
8. App detects authenticated + no session → ensureAppUser() called
9. App user created, isAdmin checked, sessionId generated
10. Header shows "User" button
```

---

## Sign Up Flow (Email/Password)

### Happy Path

```
1. User clicks "Sign Up"
2. Modal opens with: Name, Email, Password fields + Google button
3. User fills form, clicks "Create Account"
4. CLIENT: Validate password meets requirements
5. CLIENT: signUp.email() → Better Auth user created
6. CLIENT: emailOtp.sendVerificationOtp() → OTP sent
7. Modal switches to verification view
8. User enters 6-digit code
9. CLIENT: emailOtp.verifyEmail() → email verified
10. CLIENT: signIn.email() → user authenticated
11. CLIENT: ensureAppUser() → app user created, sessionId generated
12. Modal closes
```

---

## Sign In Flow (Email/Password)

### Happy Path

```
1. User clicks "Sign In"
2. Modal opens with: Email, Password fields + Google button
3. User fills form, clicks "Sign In"
4. CLIENT: signIn.email()
5. Credentials valid → authenticated
6. CLIENT: ensureAppUser() → sessionId generated
7. Modal closes
```

---

## Sign Out Flow

**Important:** Navigate away BEFORE calling signOut to avoid UI flicker.

```typescript
const handleSignOut = async () => {
  onSignOut() // Navigate away first
  await authClient.signOut()
}
```

---

## Password Reset Flow

### Security Principle

**Never reveal whether an account exists.**

> "If an account with a password exists for this email, we've sent a reset code."

---

## Testing Checklist

See [testing.md](testing.md) for detailed patterns.

### Google OAuth
- [x] New user created
- [x] Existing user signs in
- [x] App user created
- [x] isAdmin checked

### Email/Password Sign Up
- [x] Verification email received
- [x] Code verifies account
- [x] User logged in after verify
- [x] Password requirements enforced

### Session Enforcement
- [x] Cross-device kick works
- [x] Duplicate tab detection works
- [x] Session ended UI shown

### Admin
- [x] Admin email in table → sees AdminPage
- [x] Sign out works without flicker

---

## File Reference

| File | Purpose |
|------|--------|
| `convex/schema.ts` | users, admins tables |
| `convex/users.ts` | ensureAppUser, validateSession |
| `src/hooks/useSession.ts` | Session management |
| `src/components/modals/AuthModal.tsx` | Auth forms |
| `src/App.tsx` | Session integration, admin routing |

---

## Related

- [better-auth.md](better-auth.md) - Auth implementation
- [emails.md](emails.md) - Email system
- [testing.md](testing.md) - Testing patterns
- [../02-frontend/single-session.md](../02-frontend/single-session.md) - Session enforcement