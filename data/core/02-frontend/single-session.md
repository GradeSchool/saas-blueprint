---
last_updated: 2026-01-29
updated_by: vector-projector
change: "Added frontmatter metadata, streamlined for setup-first reading"
status: tested
context_cost: 2KB
type: setup
requires: [core/04-auth/better-auth.md]
unlocks: []
tldr: "Prevent multiple simultaneous sessions per user. New login kills old session."
topics: [auth, sessions, security, frontend]
---

# Single Session Enforcement

Prevent users from running multiple simultaneous sessions.

**Debug guide:** [../00-overview/hardening-patterns.md](../00-overview/hardening-patterns.md) - Session ID validation, duplicate tab detection patterns

---

## Rules

- One session per user (across devices)
- One tab per session (same browser)
- Admins follow the same rules

---

## Database Schema

```typescript
// convex/schema.ts
users: defineTable({
  // ... other fields
  activeSessionId: v.optional(v.string()),
  sessionStartedAt: v.optional(v.number()),
})
```

---

## Server Implementation

**convex/users.ts:**

```typescript
const SESSION_ID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const validateSession = query({
  args: { sessionId: v.string() },
  handler: async (ctx, { sessionId }) => {
    if (!SESSION_ID_REGEX.test(sessionId)) {
      return { valid: false, reason: 'invalid_session_id' as const };
    }
    
    let authUser;
    try {
      authUser = await authComponent.getAuthUser(ctx);
    } catch {
      return { valid: false, reason: 'not_authenticated' as const };
    }
    if (!authUser) return { valid: false, reason: 'not_authenticated' as const };
    
    const appUser = await ctx.db.query('users')
      .withIndex('by_authUserId', q => q.eq('authUserId', authUser._id))
      .unique();
    
    if (!appUser) return { valid: false, reason: 'no_app_user' as const };
    
    if (appUser.activeSessionId === sessionId) {
      return { valid: true };
    }
    
    return { valid: false, reason: 'session_invalidated' as const };
  },
});

export const ensureAppUser = mutation({
  handler: async (ctx) => {
    // ... get auth user, find/create app user ...
    
    const sessionId = crypto.randomUUID();
    await ctx.db.patch(userId, {
      activeSessionId: sessionId,
      sessionStartedAt: Date.now(),
    });
    
    return { sessionId, /* ... */ };
  },
});
```

---

## Client Hook

**src/hooks/useSession.ts:**

```typescript
export function useSession(isAuthenticated: boolean) {
  const [sessionId, setSessionIdState] = useState<string | null>(() => 
    safeLocalGet(SESSION_KEY)
  );
  const [isDuplicateTab, setIsDuplicateTab] = useState(false);
  const tabId = useRef(crypto.randomUUID());
  const tabOpenedAt = useRef<number | null>(null);
  
  const sessionValidation = useQuery(
    api.users.validateSession,
    isAuthenticated && sessionId ? { sessionId } : 'skip'
  );
  
  const isSessionValid = sessionValidation?.valid;
  const isSessionIdInvalid = sessionValidation?.reason === 'invalid_session_id';
  const effectiveSessionId = isSessionIdInvalid ? null : sessionId;
  
  const wasKicked = sessionValidation?.reason === 'session_invalidated';
  
  // Clear invalid session
  useEffect(() => {
    if (isSessionIdInvalid) safeLocalRemove(SESSION_KEY);
  }, [isSessionIdInvalid]);
  
  // BroadcastChannel duplicate detection
  useEffect(() => {
    if (!effectiveSessionId) return;
    if (tabOpenedAt.current === null) tabOpenedAt.current = Date.now();
    
    const isDuplicateFor = (otherOpenedAt: number, otherTabId: string) => {
      const currentOpenedAt = tabOpenedAt.current ?? 0;
      if (otherOpenedAt < currentOpenedAt) return true;
      if (otherOpenedAt > currentOpenedAt) return false;
      return otherTabId.localeCompare(tabId.current) < 0;
    };
    
    const channel = new BroadcastChannel('vp_tab_coordination');
    channel.onmessage = (e) => {
      if (e.data.type === 'TAB_EXISTS' && isDuplicateFor(e.data.openedAt, e.data.tabId)) {
        setIsDuplicateTab(true);
      }
    };
    
    setTimeout(() => {
      channel.postMessage({ type: 'TAB_CHECK', tabId: tabId.current, openedAt: tabOpenedAt.current });
    }, 100);
    
    return () => channel.close();
  }, [effectiveSessionId]);
  
  return { sessionId: effectiveSessionId, isSessionValid, isDuplicateTab, wasKicked, /* ... */ };
}
```

---

## App Integration

```tsx
const { isDuplicateTab, wasKicked } = useSession(isAuthenticated)

if (isDuplicateTab) return <DuplicateTabWarning />
if (wasKicked) return <SessionEndedWarning />
```

---

## Related

- [auth-ui-state.md](auth-ui-state.md) - Auth loading states
- [../00-overview/hardening-patterns.md](../00-overview/hardening-patterns.md) - Security patterns