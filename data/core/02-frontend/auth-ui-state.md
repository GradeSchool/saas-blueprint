---
last_updated: 2026-01-27
updated_by: vector-projector
change: "Added note about avatar/skeleton for future"
status: tested
tldr: "Prevent flash of wrong auth state during sign-in, sign-out, and refresh."
topics: [auth, frontend, ui, state, loading]
---

# Auth UI State Management

Preventing flash of wrong auth state during sign-in, sign-out, and page refresh.

## The Problem

After OAuth redirect or page refresh, multiple async operations happen:
1. Convex connects
2. Better Auth token validated
3. `ensureAppUser` mutation runs
4. Session validation query runs
5. App user query runs

If UI reacts to partial state, users see buttons flash between states.

## Solution: Composite Loading State

Track ALL loading states, show loading UI until everything resolves.

### State Variables

```typescript
const { isLoading, isAuthenticated } = useConvexAuth()
const [isEnsuringUser, setIsEnsuringUser] = useState(false)
const [isSigningOut, setIsSigningOut] = useState(false)
const [authPending, setAuthPending] = useState(false)
```

### Computed States

```typescript
// Individual loading conditions
const isSessionValidationPending = isAuthenticated && !!sessionId && isSessionValid === undefined
const isAppUserLoading = isAuthenticated && !!sessionId && appUserQuery === undefined

// Composite: ANY loading = show loading UI
const isAuthResolving = isLoading || isEnsuringUser || isSigningOut || isSessionValidationPending || isAppUserLoading

// Final UI decisions
const shouldShowUser = !isAuthResolving && isAuthenticated && hasValidSession && !!effectiveAppUser
const shouldShowSignedOut = !isAuthenticated && !sessionId && !authPending
```

### Three UI States

```tsx
{shouldShowUser ? (
  <button>User</button>
) : shouldShowSignedOut ? (
  <div>
    <button>Sign Up</button>
    <button>Sign In</button>
  </div>
) : (
  // Loading state - show disabled User button
  <button disabled>User</button>
)}
```

**Key insight:** The loading state shows a disabled "User" button, not spinner/ellipsis. This previews what will appear, reducing perceived jank.

**Future consideration:** When "User" text becomes an avatar image, the loading state should show a skeleton placeholder (e.g., gray circle) instead of disabled text. The state management pattern stays the same.

## OAuth Pending Flag

Use `sessionStorage` (not localStorage) to track OAuth redirect in progress.

### Before OAuth Redirect

```typescript
// AuthModal.tsx
const handleGoogleSignIn = async () => {
  sessionStorage.setItem('vp_auth_pending', 'true')
  await authClient.signIn.social({ provider: 'google' })
}
```

### On App Load

```typescript
// App.tsx
useEffect(() => {
  setAuthPending(sessionStorage.getItem('vp_auth_pending') === 'true')
}, [])
```

### Clear When Fully Resolved

```typescript
useEffect(() => {
  if (!authPending) return
  if (isAuthenticated && sessionId && appUserQuery !== undefined) {
    sessionStorage.removeItem('vp_auth_pending')
    setAuthPending(false)
  }
}, [authPending, isAuthenticated, sessionId, appUserQuery])
```

### Timeout Fallback

```typescript
useEffect(() => {
  if (!authPending) return
  const timeout = setTimeout(() => {
    if (!isAuthenticated && !sessionId) {
      sessionStorage.removeItem('vp_auth_pending')
      setAuthPending(false)
    }
  }, 15000)
  return () => clearTimeout(timeout)
}, [authPending, isAuthenticated, sessionId])
```

## Sign Out Handling

Prevent double-calls and flash during sign-out.

```typescript
const handleSignOut = async () => {
  if (isSigningOut) return  // Guard against double-call
  setIsSigningOut(true)
  try {
    await authClient.signOut()
  } catch (err) {
    console.error('Sign out failed:', err)
  } finally {
    sessionStorage.removeItem('vp_auth_pending')
    setAuthPending(false)
    clearSession()
    setAppUser(null)
    setCurrentPage('main')
    setIsSigningOut(false)
  }
}
```

## Mutation with Cleanup

Prevent state updates after unmount.

```typescript
useEffect(() => {
  if (isAuthenticated && !sessionId && !wasKicked) {
    let isActive = true
    setIsEnsuringUser(true)
    
    ensureAppUser()
      .then((result) => {
        if (!isActive) return
        setSessionId(result.sessionId)
        setAppUser({ ... })
      })
      .catch((err) => {
        console.error('Failed:', err)
      })
      .finally(() => {
        if (!isActive) return
        setIsEnsuringUser(false)
      })
    
    return () => { isActive = false }
  }
}, [...])
```

## Why sessionStorage, Not localStorage

- `sessionStorage`: Cleared when tab closes. OAuth pending flag only matters for current tab.
- `localStorage`: Persists forever. Could cause stale state if user closes tab mid-OAuth.

## Fixed-Width Container

Prevent layout shift by giving auth area fixed width.

```tsx
<div className="w-40 h-full flex shrink-0">
  {/* Auth buttons render inside fixed container */}
</div>
```

## Key Files

- `src/App.tsx` - State management, computed values, UI rendering
- `src/components/modals/AuthModal.tsx` - Sets `authPending` before OAuth

## Related

- [../04-auth/better-auth.md](../04-auth/better-auth.md) - Auth setup
- [single-session.md](single-session.md) - Session enforcement