---
last_updated: 2026-01-26
updated_by: vector-projector
change: "Updated with actual tested flow - manual OTP trigger and auto-sign-in after verify"
status: tested
---

# Sign Up / Sign In / Sessions Flow

Plain-English guide covering all scenarios. Use this as a testing checklist.

---

## Auth Methods Summary

| Method | New User | Existing User | Auto Sign-In |
|--------|----------|---------------|-------------|
| **Google OAuth** | Auto-creates account, logged in | Logged in | YES |
| **Email/Password** | Must sign up, verify email | Must sign in | NO - manual after verify |

**Key insight:** Google OAuth has no sign up vs sign in distinction. "Continue with Google" works for both. Email/password requires explicit steps.

---

## User States

| State | Description |
|-------|-------------|
| **Logged out, no account** | Never signed up. Fresh visitor. |
| **Logged out, has account (unverified)** | Signed up with email but never verified. |
| **Logged out, has account (verified)** | Has completed signup and verification. |
| **Logged in (user)** | Authenticated, regular user. |
| **Logged in (admin)** | Authenticated, admin privileges. |

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
6. If no account exists → account created automatically
7. User logged in (email already verified by Google)
8. Modal closes, header shows "User" button
9. Session started
```

### Client Code

```typescript
await authClient.signIn.social({ provider: 'google' })
// That's it! Everything else is automatic.
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

See [better-auth.md](better-auth.md#-critical-two-verification-systems) for technical details.

### Happy Path

```
1. User clicks "Sign Up"
2. Modal opens with: Name, Email, Password fields + Google button
3. User fills form, clicks "Create Account"
4. CLIENT: signUp.email() called → user created in database
5. CLIENT: emailOtp.sendVerificationOtp() called → OTP sent
6. Modal switches to verification view
7. User checks email, finds 6-digit code
8. User enters code in modal
9. CLIENT: emailOtp.verifyEmail() called → email marked verified
10. CLIENT: signIn.email() called → user logged in
11. Modal closes, header shows "User" button
12. Session started
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

// User is now signed in!
```

### Error Cases

| Scenario | Error Message | Behavior |
|----------|---------------|----------|
| Email already exists | "User already exists" | Stay on form, show error |
| Password too short | "Password must be at least 8 characters" | Stay on form, show error |
| Invalid email format | "Please enter a valid email" | Stay on form, show error |
| Verification code wrong | "Invalid code" | Stay on verify view, clear code input |
| Verification code expired | "Code expired" | Show resend button |
| Email send fails | "Failed to send verification code" | Show retry option |

---

## Sign In Flow (Email/Password)

### Happy Path

```
1. User clicks "Sign In"
2. Modal opens with: Email, Password fields + Google button
3. User fills form, clicks "Sign In"
4. CLIENT: signIn.email() called
5. Credentials valid → user logged in
6. Modal closes, header shows "User" button
7. Session started
```

### Client Code

```typescript
const result = await authClient.signIn.email({ email, password })
if (result.error) return handleError(result.error)
// User is signed in
```

### Error Cases

| Scenario | Error Message | Behavior |
|----------|---------------|----------|
| No account with this email | "User not found" | Stay on form, show error |
| Wrong password | "Invalid password" | Stay on form, show error |
| Account unverified | "Email not verified" | Could prompt re-verification |
| Too many attempts | "Too many attempts" | Disable form temporarily |

---

## Sign Out Flow

```
1. User is on User page
2. User clicks "Sign Out"
3. CLIENT: signOut() called
4. Session cleared
5. Redirect to main page
6. Header shows "Sign Up" + "Sign In" buttons
```

### Client Code

```typescript
await authClient.signOut()
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

### Client Code

```typescript
const result = await authClient.emailOtp.sendVerificationOtp({
  email,
  type: 'email-verification',
})
```

---

## Session Enforcement (Planned)

### Rules (Apply to Everyone)

- **One session per user** (across devices)
- **One tab per session** (same browser)
- **No exceptions** - admins follow the same rules

Keeps state management simple and robust.

### Single Session per User (Cross-Device)

```
1. User logs in on Device A → gets sessionId "abc"
2. User logs in on Device B → gets sessionId "xyz"
3. Device A's session "abc" is now invalid
4. Device A checks session → invalid → kicked out
5. Device A shows toast: "You signed in on another device"
6. Device A redirects to logged-out state
```

### Duplicate Tab Detection (Same Browser)

```
1. User has app open in Tab A
2. User opens app in Tab B
3. Tab B detects Tab A exists (BroadcastChannel)
4. Tab B shows: "You already have this app open in another tab"
5. Tab B is disabled (can't use app)
```

---

## Password Reset Flow (Planned)

### Happy Path

```
1. User clicks "Forgot Password" (on sign in modal)
2. Enter email, click "Send Reset Link"
3. If account exists, email sent with reset link
4. User clicks link in email
5. User enters new password
6. Password updated → user can sign in
```

### Security: Don't Reveal Account Existence

| Scenario | Message Shown | Actual Behavior |
|----------|---------------|------------------|
| Account exists | "Check your email" | Send reset email |
| Account doesn't exist | "Check your email" | Send nothing |

Both cases show same message to prevent account enumeration.

---

## Testing Checklist

See [testing.md](testing.md) for detailed testing patterns.

### Google OAuth (New User)

- [x] Click Sign Up → Continue with Google → account created
- [x] Click Sign In → Continue with Google → account created
- [x] No verification email needed
- [x] User logged in immediately
- [x] Session created

### Sign Up (Email/Password)

- [x] Fresh user can sign up
- [x] Verification email received (6-digit OTP)
- [x] Correct code verifies account
- [x] After verification, user is logged in automatically
- [x] Session created
- [ ] Wrong code shows error
- [ ] Expired code shows error + resend option
- [ ] Duplicate email blocked
- [ ] Weak password blocked

### Sign In (Email/Password)

- [ ] Existing verified user can sign in
- [ ] Wrong password shows error
- [ ] Non-existent email shows error
- [ ] Session created

### Sign Out

- [ ] Sign out clears session
- [ ] Header updates to logged-out state
- [ ] Can sign back in

### Session Enforcement (Not Implemented)

- [ ] Login on device B kicks device A
- [ ] Kicked user sees toast message
- [ ] Duplicate tab shows warning
- [ ] Page refresh doesn't kick user (grace period)

### Password Reset (Not Implemented)

- [ ] Reset email sent for existing account
- [ ] Same message shown for non-existent account
- [ ] Reset link works
- [ ] New password can be used to sign in

---

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| User closes browser mid-verification | Can resume by clicking Sign Up again with same email (will say "User already exists") - need to handle this better |
| User signs up with email, later tries Google with same email | "Account exists. Sign in with password." |
| User signs up with Google, later tries password sign in | "This account uses Google sign in" |
| Network error during sign up | Show error, allow retry |
| Network error during verification | Show error, allow retry |
| User rapidly clicks submit | Disable button during loading, prevent double-submit |

---

## Related

- [better-auth.md](better-auth.md) - Auth implementation (critical reading)
- [emails.md](emails.md) - Email system
- [testing.md](testing.md) - Testing patterns for solo devs
- [google-oauth-setup.md](google-oauth-setup.md) - Google OAuth setup
- [../02-frontend/single-session.md](../02-frontend/single-session.md) - Session enforcement
- [../02-frontend/modals.md](../02-frontend/modals.md) - Modal patterns