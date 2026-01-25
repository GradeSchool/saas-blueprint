---
last_updated: 2026-01-25
updated_by: vector-projector
change: "Removed admin exemption - single tab for everyone"
status: planned
---

# Single Session Enforcement

Prevent users from running multiple simultaneous sessions to control costs and abuse.

## Implementation Order

**IMPORTANT:** This must be implemented and tested immediately after basic auth, BEFORE any 2D/3D app functionality.

```
1. Basic auth (email/password + Google OAuth) ✓ in progress
2. Email verification flow ✓ in progress
3. Single session enforcement ← NEXT
4. Test complete auth + session flow
5. THEN proceed with app functionality (2D/3D)
```

The session system affects how users interact with the app. Get it right before building features on top.

---

## Rules

**Apply to everyone, no exceptions:**

- One session per user (across devices)
- One tab per session (same browser)
- Admins follow the same rules

Keeps state management simple and robust. No edge cases.

---

## Why

- Multiple tabs/browsers = multiplied requests
- Downloads multiply, bandwidth costs rise
- Local state diverges between tabs = confusing UX
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
// convex/sessions.ts
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

const { data: isValid } = useQuery(api.sessions.validateSession, {
  userId,
  sessionId: sessionId.current
})

useEffect(() => {
  if (isValid === false) {
    // Kicked - show message and logout
    logout()
    toast.error("Session expired. You signed in on another device.")
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
    <div className="flex h-screen items-center justify-center p-8 text-center">
      <div>
        <h1 className="text-xl font-semibold mb-2">Duplicate Tab</h1>
        <p className="text-muted-foreground">
          You already have this app open in another tab.
        </p>
      </div>
    </div>
  )
}
```

## Grace Period

Allow brief overlap for page refreshes:

```typescript
const GRACE_PERIOD = 5000 // 5 seconds

export const validateSession = query({
  args: { userId: v.id("users"), sessionId: v.string() },
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
| Session kicked | Toast: "You signed in on another device" |

## Integration with Auth

After successful sign-in (email/password or OAuth):

```typescript
// In auth success handler
const sessionId = await startSession({ userId })
localStorage.setItem('sessionId', sessionId)
```

## Related

- [signup-signin-sessions-flow.md](../04-auth/signup-signin-sessions-flow.md) - Full flow guide
- [better-auth.md](../04-auth/better-auth.md) - Auth setup