---
last_updated: 2026-01-27
updated_by: vector-projector
change: "Added app users table, admin system, and two-table architecture documentation"
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
// Returns: { userId, email, name, isAdmin }
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

**Applies to:**
- Sign up (new password)
- Password reset (new password)

---

## UI Pattern: Spam Folder Callout

**CRITICAL:** Every modal/screen where an email was sent MUST include:

```
┌─────────────────────────────────────────────┐
│  📧 Check your spam folder if you don't    │
│     see the email in your inbox.            │
└─────────────────────────────────────────────┘
```

Applies to:
- Email verification (after signup)
- Password reset (after requesting code)
- Any future email-based flows

---

## User States

| State | Description |
|-------|-------------|
| **Logged out, no account** | Never signed up. Fresh visitor. |
| **Logged out, has account (unverified)** | Signed up with email but never verified. |
| **Logged out, has account (verified)** | Has completed signup and verification. |
| **Logged in (user)** | Authenticated, regular user. |
| **Logged in (admin)** | Authenticated, email in admins table. |

---

## Header Button States

| User State | Header Shows |
|------------|-------------|
| Logged out | **Sign Up** button + **Sign In** button |
| Logged in | **User** button |
| Loading | Loading indicator |

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
8. App detects authenticated + no app user → ensureAppUser() called
9. App user created, isAdmin checked
10. Header shows "User" button
```

### Client Code

```typescript
await authClient.signIn.social({ provider: 'google' })
// Redirects to Google, then back to app
// App.tsx useEffect handles ensureAppUser on return
```

### Error Cases

| Scenario | Behavior |
|----------|----------|
| User cancels Google consent | Return to app, modal still open |
| Google email matches existing password account | See "Account Linking" below |
| Google auth fails | Show error, allow retry |
| Network error | Show error, allow retry |

### Account Linking (Email Collision)

If user tries Google OAuth but already has a password account with that email:

| Approach | Behavior |
|----------|----------|
| **Block** | "Account exists. Sign in with password." |
| **Link** | Link Google to existing account (requires password verification) |

**Current implementation:** Block. User must sign in with password.

---

## Sign Up Flow (Email/Password)

### ⚠️ Critical: Manual Steps Required

Unlike Google OAuth, email/password signup requires **manual triggering** of:
1. Sending the verification OTP
2. Signing in after verification
3. Creating app user after sign-in

See [better-auth.md](better-auth.md#-critical-two-verification-systems) for technical details.

### Happy Path

```
1. User clicks "Sign Up"
2. Modal opens with: Name, Email, Password fields + Google button
   └─ Password helper shows: "12+ chars, uppercase, lowercase, number, special"
3. User fills form, clicks "Create Account"
4. CLIENT: Validate password meets requirements (client-side first)
5. CLIENT: signUp.email() called → Better Auth user created
6. CLIENT: emailOtp.sendVerificationOtp() called → OTP sent
7. Modal switches to verification view
   └─ Shows: "Check your spam folder" callout
8. User checks email, finds 6-digit code
9. User enters code in modal
10. CLIENT: emailOtp.verifyEmail() called → email marked verified
11. CLIENT: signIn.email() called → user authenticated
12. CLIENT: ensureAppUser() called → app user created, isAdmin checked
13. Modal closes, header shows "User" button
```

### Client Code (Simplified)

```typescript
// Step 1-2: Create user and send OTP
const signup = await authClient.signUp.email({ email, password, name })
if (signup.error) return handleError(signup.error)

const otp = await authClient.emailOtp.sendVerificationOtp({ 
  email, 
  type: 'email-verification' 
})
if (otp.error) return handleError(otp.error)

// Show verification UI... user enters code...

// Step 3-4: Verify and sign in
const verify = await authClient.emailOtp.verifyEmail({ email, otp: userCode })
if (verify.error) return handleError(verify.error)

const signin = await authClient.signIn.email({ email, password })
if (signin.error) return handleError(signin.error)

// Step 5: Create app user
await ensureAppUser()

// User is now signed in with app user created!
```

### Error Cases

| Scenario | Error Message | Behavior |
|----------|---------------|----------|
| Email already exists | "An account with this email already exists" | Show on email field |
| Password missing requirements | "Missing: uppercase, number" (example) | Show on password field |
| Name empty (signup) | "Name is required" | Show on name field |
| Invalid email format | "Please enter a valid email" | Show on email field |
| Verification code wrong | "Invalid code" | Stay on verify view, clear code input |
| Verification code expired | "Code expired" | Show resend button |
| Email send fails | "Failed to send verification code" | Show retry option |

---

## Sign In Flow (Email/Password)

### Happy Path

```
1. User clicks "Sign In"
2. Modal opens with: Email, Password fields + Google button + "Forgot password?" link
3. User fills form, clicks "Sign In"
4. CLIENT: signIn.email() called
5. Credentials valid → user authenticated
6. CLIENT: ensureAppUser() called → app user exists or created, isAdmin checked
7. Modal closes, header shows "User" button
```

### Client Code

```typescript
const result = await authClient.signIn.email({ email, password })
if (result.error) return handleError(result.error)

await ensureAppUser()
// User is signed in
```

### Error Cases

| Scenario | Error Message | Behavior |
|----------|---------------|----------|
| No account with this email | "No account found with this email" | Stay on form, show error |
| Wrong password | "Invalid email or password" | Stay on form, show error |
| Account unverified | "Please verify your email first" | Could prompt re-verification |
| Too many attempts | "Too many attempts" | Disable form temporarily |

---

## Admin Sign In Flow

**Same as regular sign-in, but with admin routing.**

```
1. Admin signs in (email/password or Google)
2. ensureAppUser() checks admins table
3. Returns isAdmin: true
4. App stores isAdmin in appUser state
5. When admin clicks "User" button → AdminPage shown (not UserPage)
```

**AdminPage features:**
- Purple "Logged in as Admin" banner at top
- Admin-specific functionality (TBD)
- Same sign-out flow as regular users

---

## Sign Out Flow

**Important:** Navigate away BEFORE calling signOut to avoid UI flicker.

```
1. User clicks "Sign Out" on User/Admin page
2. CLIENT: Navigate to main page immediately (onSignOut callback)
3. CLIENT: authClient.signOut() called
4. Session cleared
5. Header shows "Sign Up" + "Sign In" buttons
```

### Client Code

```typescript
const handleSignOut = async () => {
  onSignOut() // Navigate away first to avoid flicker
  await authClient.signOut()
}
```

---

## Password Reset Flow (Email/Password)

### Security Principle

**Never reveal whether an account exists.** This prevents attackers from enumerating valid emails.

The response is always the same regardless of account state:
> "If an account with a password exists for this email, we've sent a reset code."

### Account States When Reset Requested

| Account State | What Actually Happens | User Sees |
|--------------|----------------------|----------|
| No account exists | Do nothing (no email sent) | Same message |
| Google-only account (no password) | Do nothing (no email sent) | Same message |
| Email/password account | Send reset OTP | Same message |

User only knows if they receive an email or not.

### Happy Path

```
1. User on sign-in modal
2. User enters email address
3. User clicks "Forgot password?" link
4. CLIENT: Send reset OTP (silently handle errors)
5. Modal switches to reset view (same message regardless)
   └─ Shows: "Check your spam folder" callout
   └─ Shows: Password requirements helper text
6. User enters 6-digit code + new password (must meet requirements)
7. CLIENT: Verify OTP and update password
8. Password updated → show success
9. User can now sign in with new password
```

---

## Resend Verification Code

```
1. User is on verification view
2. Didn't receive code or code expired
3. Clicks "Resend code"
4. CLIENT: emailOtp.sendVerificationOtp() called
5. New code sent, old code invalidated
```

---

## Session Enforcement (Planned)

### Rules (Apply to Everyone)

- **One session per user** (across devices)
- **One tab per session** (same browser)
- **No exceptions** - admins follow the same rules

Keeps state management simple and robust.

---

## Testing Checklist

See [testing.md](testing.md) for detailed testing patterns.

### Google OAuth (New User)

- [x] Click Sign Up → Continue with Google → account created
- [x] Click Sign In → Continue with Google → account created
- [x] No verification email needed
- [x] User logged in immediately
- [x] App user created in `users` table
- [x] isAdmin checked against `admins` table

### Sign Up (Email/Password)

- [x] Fresh user can sign up
- [x] Verification email received (6-digit OTP)
- [x] Correct code verifies account
- [x] After verification, user is logged in automatically
- [x] App user created in `users` table
- [x] Password requirements shown as helper text
- [x] Missing requirements shown as specific error
- [x] Duplicate email blocked with field-level error
- [x] Spam folder callout visible

### Sign In (Email/Password)

- [x] Existing verified user can sign in
- [x] App user exists or is created
- [x] isAdmin checked on sign-in
- [ ] Wrong password shows error
- [ ] Non-existent email shows error

### Admin Sign In

- [x] Add email to `admins` table manually
- [x] Sign in with that email
- [x] Click "User" button → see AdminPage (not UserPage)
- [x] "Logged in as Admin" banner visible
- [x] Sign out works without flicker

### Password Reset

- [x] "Forgot password?" shows helpful text when email empty
- [x] "Forgot password?" link enabled when email filled
- [x] Clicking link shows reset modal with vague message
- [x] Password requirements shown on new password field
- [x] Reset button disabled until password meets requirements
- [ ] Valid code + new password resets successfully
- [ ] Invalid code shows error
- [x] Spam folder callout visible

### Sign Out

- [x] Sign out navigates away first (no flicker)
- [x] Header updates to logged-out state
- [x] Can sign back in

---

## File Reference

| File | Purpose |
|------|--------|
| `convex/schema.ts` | Defines `users` and `admins` tables |
| `convex/users.ts` | `ensureAppUser` mutation, `getCurrentAppUser` query |
| `convex/auth.ts` | Better Auth configuration |
| `src/components/modals/AuthModal.tsx` | Sign up/in forms, calls ensureAppUser |
| `src/App.tsx` | Routes to AdminPage or UserPage based on isAdmin |
| `src/components/AdminPage.tsx` | Admin-only page |
| `src/components/UserPage.tsx` | Regular user page |

---

## Related

- [better-auth.md](better-auth.md) - Auth implementation (critical reading)
- [emails.md](emails.md) - Email system
- [testing.md](testing.md) - Testing patterns for solo devs
- [google-oauth-setup.md](google-oauth-setup.md) - Google OAuth setup
- [../02-frontend/single-session.md](../02-frontend/single-session.md) - Session enforcement