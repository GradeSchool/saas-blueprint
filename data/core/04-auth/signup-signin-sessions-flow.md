---
last_updated: 2026-01-25
updated_by: vector-projector
change: "Removed admin exceptions - single tab for everyone"
status: planned
---

# Sign Up / Sign In / Sessions Flow

Plain-English guide covering all scenarios. Use this as a testing checklist.

---

## User States

| State | Description |
|-------|-------------|
| **Logged out, no account** | Never signed up. Fresh visitor. |
| **Logged out, has account (unverified)** | Signed up but never entered verification code. |
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

## Sign Up Flow (Email/Password)

### Happy Path

```
1. User clicks "Sign Up"
2. Modal opens with: Name, Email, Password fields
3. User fills form, clicks "Create Account"
4. Account created in database
5. Verification email sent (6-digit code)
6. Modal switches to verification view
7. User enters code from email
8. Code valid → account verified → user logged in
9. Modal closes, header shows "User" button
10. Session started (sessionId stored)
```

### Error Cases

| Scenario | Error Message | Behavior |
|----------|---------------|----------|
| Email already exists | "Email already registered" | Stay on form, show error |
| Password too short | "Password must be at least 8 characters" | Stay on form, show error |
| Invalid email format | "Please enter a valid email" | Stay on form, show error |
| Verification code wrong | "Invalid code" | Stay on verify view, clear code input |
| Verification code expired | "Code expired. Request a new one." | Show resend button |
| Email send fails | "Failed to send verification email" | Show retry option |

---

## Sign Up Flow (Google OAuth)

### Happy Path

```
1. User clicks "Sign Up" then "Continue with Google" (or separate Google button)
2. Redirect to Google consent screen
3. User approves
4. Redirect back to app
5. Account created with Google email (auto-verified)
6. User logged in immediately (no email verification needed)
7. Session started
```

### Error Cases

| Scenario | Error Message | Behavior |
|----------|---------------|----------|
| User cancels Google consent | (none) | Return to app, modal still open |
| Google email already has password account | "Account exists. Sign in with password." | Prompt to use password sign in |
| Google auth fails | "Google sign in failed" | Show error, allow retry |

---

## Sign In Flow (Email/Password)

### Happy Path

```
1. User clicks "Sign In"
2. Modal opens with: Email, Password fields
3. User fills form, clicks "Sign In"
4. Credentials valid → user logged in
5. Modal closes, header shows "User" button
6. Session started (kicks any previous session)
```

### Error Cases

| Scenario | Error Message | Behavior |
|----------|---------------|----------|
| No account with this email | "No account found" | Stay on form, show error |
| Wrong password | "Incorrect password" | Stay on form, show error |
| Account exists but unverified | "Please verify your email first" | Switch to verification view, resend code |
| Account is Google-only | "This account uses Google sign in" | Prompt to use Google |
| Too many attempts | "Too many attempts. Try again later." | Disable form temporarily (rate limit) |

---

## Sign In Flow (Google OAuth)

### Happy Path

```
1. User clicks "Sign In" then "Continue with Google"
2. Redirect to Google consent screen
3. User approves
4. Redirect back to app
5. Account found → user logged in
6. Session started
```

### Error Cases

| Scenario | Error Message | Behavior |
|----------|---------------|----------|
| No account with this Google email | "No account found. Sign up first." | Prompt to sign up |
| User cancels Google consent | (none) | Return to app, modal still open |

---

## Sign Out Flow

```
1. User is on User page
2. User clicks "Sign Out"
3. Session cleared (server + localStorage)
4. Redirect to main page
5. Header shows "Sign Up" + "Sign In" buttons
```

---

## Session Enforcement

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

### Page Refresh (Grace Period)

```
1. User refreshes page
2. New tab instance starts
3. Within 5 seconds, old session still valid
4. User stays logged in seamlessly
```

---

## Password Reset Flow

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

## Verification Email Resend

```
1. User is on verification view (after signup)
2. Didn't receive code or code expired
3. Clicks "Resend code"
4. New code sent, old code invalidated
5. Rate limit: max 3 resends per hour
```

---

## Testing Checklist

### Sign Up (Email/Password)

- [ ] Fresh user can sign up
- [ ] Verification email received
- [ ] Correct code verifies account
- [ ] Wrong code shows error
- [ ] Expired code shows error + resend option
- [ ] Duplicate email blocked
- [ ] Weak password blocked
- [ ] After verification, user is logged in
- [ ] Session created

### Sign Up (Google OAuth)

- [ ] Fresh user can sign up with Google
- [ ] No verification email needed
- [ ] User logged in immediately
- [ ] Session created
- [ ] Cancel at Google returns to app gracefully

### Sign In (Email/Password)

- [ ] Existing verified user can sign in
- [ ] Wrong password shows error
- [ ] Non-existent email shows error
- [ ] Unverified account prompts verification
- [ ] Session created, previous session kicked

### Sign In (Google OAuth)

- [ ] Existing Google user can sign in
- [ ] Non-existent Google user prompted to sign up
- [ ] Cancel at Google returns gracefully

### Session Enforcement

- [ ] Login on device B kicks device A
- [ ] Kicked user sees toast message
- [ ] Duplicate tab shows warning
- [ ] Page refresh doesn't kick user (grace period)
- [ ] Admins follow same rules as users

### Sign Out

- [ ] Sign out clears session
- [ ] Header updates to logged-out state
- [ ] Can sign back in

### Password Reset

- [ ] Reset email sent for existing account
- [ ] Same message shown for non-existent account
- [ ] Reset link works
- [ ] New password can be used to sign in

---

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| User closes browser mid-verification | Can resume by clicking Sign In (prompts for verification) |
| User signs up with email, later tries Google with same email | "Account exists. Sign in with password." |
| User signs up with Google, later tries password sign in | "This account uses Google sign in" |
| Network error during sign up | Show error, allow retry |
| Network error during verification | Show error, allow retry |
| User rapidly clicks submit | Disable button during loading, prevent double-submit |

---

## Related

- [better-auth.md](better-auth.md) - Auth implementation
- [emails.md](emails.md) - Email system
- [../02-frontend/single-session.md](../02-frontend/single-session.md) - Session enforcement
- [../02-frontend/modals.md](../02-frontend/modals.md) - Modal patterns