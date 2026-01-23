---
last_updated: 2026-01-23
updated_by: saas-blueprint
change: "Initial single session enforcement pattern"
---

# Single Session Enforcement

Prevent users from running multiple simultaneous sessions to control costs and abuse.

## Why

- Multiple tabs/browsers = multiplied requests
- Downloads multiply, bandwidth costs rise
- Rate limiting alone doesn't prevent parallel abuse

## Strategy

Combine two approaches:

1. **Convex**: Single `activeSessionId` per user (cross-device)
2. **BroadcastChannel**: Detect duplicate tabs (same browser)

## Convex Session

Store active session on user record. New login kicks previous.

```typescript
// convex/schema.ts
users: defineTable({
  // ... other fields
  activeSessionId: v.optional(v.string()),
  sessionStarted: v.optional(v.number()),
})
```

```typescript
// convex/auth.ts
export const startSession = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const sessionId = crypto.randomUUID()
    await ctx.db.patch(userId, {
      activeSessionId: sessionId,
      sessionStarted: Date.now(),
    })
    return sessionId
  },
})

export const validateSession = query({
  args: { userId: v.id("users"), sessionId: v.string() },
  handler: async (ctx, { userId, sessionId }) => {
    const user = await ctx.db.get(userId)
    return user?.activeSessionId === sessionId
  },
})
```

## Client Session Check

```typescript
// hooks/useSession.ts
const sessionId = useRef(localStorage.getItem('sessionId'))

const { data: isValid } = useQuery(api.auth.validateSession, {
  userId,
  sessionId: sessionId.current
})

useEffect(() => {
  if (isValid === false) {
    // Kicked - show message and logout
    logout()
    toast.error("Session expired. You logged in elsewhere.")
  }
}, [isValid])
```

## BroadcastChannel (Same Browser)

Detect and warn about duplicate tabs:

```typescript
// hooks/useTabCoordination.ts
export function useTabCoordination() {
  const [isDuplicate, setIsDuplicate] = useState(false)
  const tabId = useRef(crypto.randomUUID())

  useEffect(() => {
    const channel = new BroadcastChannel('app-session')

    // Announce this tab
    channel.postMessage({ type: 'TAB_OPEN', tabId: tabId.current })

    // Listen for other tabs
    channel.onmessage = (e) => {
      if (e.data.type === 'TAB_OPEN' && e.data.tabId !== tabId.current) {
        setIsDuplicate(true)
      }
    }

    return () => channel.close()
  }, [])

  return { isDuplicate }
}
```

```tsx
// App.tsx
const { isDuplicate } = useTabCoordination()

if (isDuplicate) {
  return (
    <div className="...">
      <h1>Duplicate Tab</h1>
      <p>You already have this app open in another tab.</p>
    </div>
  )
}
```

## Grace Period

Allow brief overlap for page refreshes:

```typescript
// On session validation, allow 5s grace
const GRACE_PERIOD = 5000

export const validateSession = query({
  handler: async (ctx, { userId, sessionId }) => {
    const user = await ctx.db.get(userId)

    if (user?.activeSessionId === sessionId) return true

    // Grace period for refreshes
    const elapsed = Date.now() - (user?.sessionStarted || 0)
    if (elapsed < GRACE_PERIOD) return true

    return false
  },
})
```

## User Experience

| Scenario | Behavior |
|----------|----------|
| Login on new device | Previous session kicked |
| Open duplicate tab | Warning shown, tab disabled |
| Page refresh | Grace period allows it |
| Session kicked | Toast: "Logged in elsewhere" |

## Admins Exempt

Admins skip session enforcement (they need multiple tabs for support):

```typescript
const isAdmin = await checkAdmin(userId)
if (isAdmin) return true // Skip session check
```

## Related

- [admin-panel.md](admin-panel.md) - Admin exemption
- [better-auth.md](../04-auth/better-auth.md) - Auth setup
