---
last_updated: 2026-01-28
updated_by: vector-projector
change: "Initial documentation for admin alerts feature"
status: tested
---

# Alerts

Admin-to-user broadcast messaging system. Allows admins to send announcements that all logged-in users will see.

## Prerequisites

- Convex backend set up (see [convex setup](../03-convex/setup.md))
- Authentication working (see [auth](../04-auth/better-auth.md))
- Users table with `lastSeenAlertAt` field

## Intent

Simple, low-friction way for admins to communicate with users:
- "New version deployed, please refresh"
- "New models added to the library"
- "Scheduled maintenance tonight"

Not meant for critical system alerts or complex notification systems.

## Behavior

| Rule | Description |
|------|-------------|
| **24-hour expiry** | Alerts automatically disappear after 24 hours |
| **All active shown** | Users see a list of all non-expired alerts |
| **Red dot indicator** | Shows on User button when unread alerts exist |
| **Auto-mark read** | Visiting User page marks alerts as seen |
| **No cleanup needed** | Old alerts stay in DB but are filtered out by queries |

## Flow

```
Admin posts alert
       ↓
Stored in alerts table with createdAt timestamp
       ↓
All logged-in users see red dot on User button
       ↓
User clicks User button → sees all active alerts
       ↓
lastSeenAlertAt updated → red dot disappears
       ↓
After 24 hours, alert no longer returned by queries
```

## Database Schema

### Alerts Table

```typescript
// convex/schema.ts
alerts: defineTable({
  message: v.string(),      // Alert text (can include emojis)
  createdAt: v.number(),    // Timestamp for expiry calculation
  createdBy: v.id("users"), // Admin who sent it
}).index("by_createdAt", ["createdAt"]),
```

### User Field

```typescript
// Add to users table
lastSeenAlertAt: v.optional(v.number()),
```

## Convex Functions

### convex/alerts.ts

```typescript
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";

const ALERT_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// Get all active (non-expired) alerts, newest first
export const getActive = query({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - ALERT_EXPIRY_MS;
    const alerts = await ctx.db
      .query("alerts")
      .withIndex("by_createdAt")
      .order("desc")
      .collect();
    return alerts.filter((alert) => alert.createdAt > cutoff);
  },
});

// Check if user has unread alerts
export const hasUnread = query({
  args: {},
  handler: async (ctx) => {
    let authUser;
    try {
      authUser = await authComponent.getAuthUser(ctx);
    } catch {
      return false; // Handle sign-out race condition
    }
    if (!authUser) return false;

    const appUser = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", authUser._id))
      .first();
    if (!appUser) return false;

    const cutoff = Date.now() - ALERT_EXPIRY_MS;
    const lastSeen = appUser.lastSeenAlertAt ?? 0;

    const alerts = await ctx.db
      .query("alerts")
      .withIndex("by_createdAt")
      .order("desc")
      .collect();

    return alerts.some(
      (alert) => alert.createdAt > cutoff && alert.createdAt > lastSeen
    );
  },
});

// Create alert (admin only)
export const create = mutation({
  args: { message: v.string() },
  handler: async (ctx, args) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) throw new Error("Not authenticated");

    const appUser = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", authUser._id))
      .first();
    if (!appUser) throw new Error("User not found");

    // Verify admin (check your admin table)
    const admin = await ctx.db
      .query("admins")
      .withIndex("by_email", (q) => q.eq("email", appUser.email))
      .first();
    if (!admin) throw new Error("Not authorized - admin only");

    return await ctx.db.insert("alerts", {
      message: args.message.trim(),
      createdAt: Date.now(),
      createdBy: appUser._id,
    });
  },
});

// Mark alerts as read
export const markAsRead = mutation({
  args: {},
  handler: async (ctx) => {
    let authUser;
    try {
      authUser = await authComponent.getAuthUser(ctx);
    } catch {
      return { success: false };
    }
    if (!authUser) return { success: false };

    const appUser = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", authUser._id))
      .first();
    if (!appUser) return { success: false };

    await ctx.db.patch(appUser._id, { lastSeenAlertAt: Date.now() });
    return { success: true };
  },
});
```

## Frontend Components

### Red Dot Indicator (App.tsx)

```tsx
const hasUnreadAlerts = useQuery(
  api.alerts.hasUnread,
  isAuthenticated && sessionId ? {} : "skip"
);

// In the User button:
<button className="relative ...">
  User
  {hasUnreadAlerts && (
    <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full" />
  )}
</button>
```

### User Page Alert Display

```tsx
const activeAlerts = useQuery(api.alerts.getActive);
const hasUnread = useQuery(api.alerts.hasUnread);
const markAsRead = useMutation(api.alerts.markAsRead);

// Auto-mark as read when viewing
useEffect(() => {
  if (hasUnread === true) {
    markAsRead().catch(() => {});
  }
}, [hasUnread, markAsRead]);

// Display alerts
{activeAlerts && activeAlerts.length > 0 && (
  <section className="bg-amber-50 border border-amber-200 rounded-lg p-4">
    <h2 className="font-semibold mb-3">Updates</h2>
    <div className="space-y-3">
      {activeAlerts.map((alert) => (
        <div key={alert._id} className="border-l-2 border-amber-300 pl-3">
          <p>{alert.message}</p>
          <p className="text-xs text-amber-600 mt-1">
            {new Date(alert.createdAt).toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  </section>
)}
```

### Admin Alert Writer

```tsx
const [message, setMessage] = useState('');
const createAlert = useMutation(api.alerts.create);

const handleSend = async () => {
  if (!message.trim()) return;
  await createAlert({ message });
  setMessage('');
};

<textarea
  value={message}
  onChange={(e) => setMessage(e.target.value)}
  placeholder="Type alert message..."
  maxLength={500}
/>
<button onClick={handleSend}>Send Alert</button>
```

## Emoji Support (Optional)

For emoji picker, we use [Frimousse](https://frimousse.liveblocks.io/) with shadcn/ui:

```bash
npx shadcn@latest add popover
npx shadcn@latest add https://frimousse.liveblocks.io/r/emoji-picker
```

Then wrap the textarea with a Popover trigger for the emoji picker.

## Sign-Out Race Condition

Important: The `hasUnread` and `markAsRead` functions wrap `getAuthUser` in try-catch to handle the race condition during sign-out. Without this, users see errors when signing out.

## Key Files

- `convex/schema.ts` - alerts table, lastSeenAlertAt field
- `convex/alerts.ts` - queries and mutations
- `src/App.tsx` - red dot indicator on User button
- `src/components/UserPage.tsx` - alert display, auto-mark read
- `src/components/AdminPage.tsx` - alert writer form

## Related

- [admin-panel.md](admin-panel.md) - Admin page structure
- [auth-ui-state.md](auth-ui-state.md) - Auth state management
