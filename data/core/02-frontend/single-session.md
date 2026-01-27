---
last_updated: 2026-01-27
updated_by: vector-projector
change: "Updated to reflect actual implementation - no grace period, correct field names"
status: tested
---

# Single Session Enforcement

Prevent users from running multiple simultaneous sessions.

## Rules

**Apply to everyone, no exceptions:**

- One session per user (across devices)
- One tab per session (same browser)
- Admins follow the same rules

## Strategy

Two-pronged approach:

1. **Convex**: `activeSessionId` field on users table (cross-device)
2. **BroadcastChannel**: Detect duplicate tabs (same browser)

## Database Schema

```typescript
// convex/schema.ts
users: defineTable({
  // ... other fields
  activeSessionId: v.optional(v.string()),
  sessionStartedAt: v.optional(v.number()),
})
```

## Server Implementation

```typescript
// convex/users.ts
export const ensureAppUser = mutation({
  handler: async (ctx) => {
    // ... get auth user, find/create app user ...
    
    // Generate new session ID (invalidates any previous)
    const sessionId = crypto.randomUUID()
    await ctx.db.patch(userId, {
      activeSessionId: sessionId,
      sessionStartedAt: Date.now(),
    })
    
    return { sessionId, /* ... */ }
  },
})

export const validateSession = query({
  args: { sessionId: v.string() },
  handler: async (ctx, { sessionId }) => {
    const authUser = await authComponent.getAuthUser(ctx)
    if (!authUser) return { valid: false, reason: 'not_authenticated' }
    
    const appUser = await ctx.db.query('users')
      .withIndex('by_authUserId', q => q.eq('authUserId', authUser._id))
      .unique()
    
    if (!appUser) return { valid: false, reason: 'no_app_user' }
    
    // Strict check - no grace period
    if (appUser.activeSessionId === sessionId) {
      return { valid: true }
    }
    
    return { valid: false, reason: 'session_invalidated' }
  },
})
```

## Client Hook

```typescript
// src/hooks/useSession.ts
export function useSession(isAuthenticated: boolean) {
  const [sessionId, setSessionIdState] = useState<string | null>(() => {
    return localStorage.getItem('vp_session_id')
  })
  const [isDuplicateTab, setIsDuplicateTab] = useState(false)
  
  // Validate session against server
  const sessionValidation = useQuery(
    api.users.validateSession,
    isAuthenticated && sessionId ? { sessionId } : 'skip'
  )
  
  // Compute kicked state
  const wasKicked = sessionValidation !== undefined && 
    !sessionValidation.valid && 
    sessionValidation.reason === 'session_invalidated'
  
  // BroadcastChannel for duplicate tab detection
  useEffect(() => {
    if (!sessionId) return
    
    const channel = new BroadcastChannel('vp_tab_coordination')
    const tabId = crypto.randomUUID()
    
    channel.onmessage = (e) => {
      if (e.data.type === 'TAB_CHECK' && e.data.tabId !== tabId) {
        channel.postMessage({ type: 'TAB_EXISTS', tabId })
      }
      if (e.data.type === 'TAB_EXISTS' && e.data.tabId !== tabId) {
        setIsDuplicateTab(true)
      }
    }
    
    setTimeout(() => {
      channel.postMessage({ type: 'TAB_CHECK', tabId })
    }, 100)
    
    return () => channel.close()
  }, [sessionId])
  
  return {
    sessionId,
    isSessionValid: sessionValidation?.valid,
    isDuplicateTab,
    wasKicked,
    setSessionId: (id: string) => {
      localStorage.setItem('vp_session_id', id)
      setSessionIdState(id)
    },
    clearSession: () => {
      localStorage.removeItem('vp_session_id')
      setSessionIdState(null)
    },
  }
}
```

## App Integration

```tsx
// App.tsx
const { isDuplicateTab, wasKicked, setSessionId } = useSession(isAuthenticated)

// Block duplicate tabs
if (isDuplicateTab) {
  return <DuplicateTabWarning />
}

// Block kicked sessions
if (wasKicked) {
  return <SessionEndedWarning onSignInAgain={clearKicked} />
}
```

## User Experience

| Scenario | Behavior |
|----------|----------|
| Login on new device | Previous session kicked immediately |
| Open duplicate tab | Warning shown, tab disabled |
| Page refresh | Works (same sessionId in localStorage) |
| Session kicked | Red warning: "You signed in on another device" |

## Key Files

| File | Purpose |
|------|--------|
| `convex/users.ts` | `ensureAppUser`, `validateSession` |
| `convex/schema.ts` | `activeSessionId`, `sessionStartedAt` fields |
| `src/hooks/useSession.ts` | Client-side session hook |
| `src/App.tsx` | UI for kicked/duplicate states |

## Related

- [../04-auth/signup-signin-sessions-flow.md](../04-auth/signup-signin-sessions-flow.md) - Full auth flow
- [../03-convex/schema.md](../03-convex/schema.md) - Schema definition