---
last_updated: 2026-01-31
updated_by: vector-projector
change: "Added opportunistic cleanup pattern instead of cron"
status: tested
tldr: "Workaround for convex-fs uploads with Better Auth cross-domain plugin."
topics: [storage, convex-fs, better-auth, upload, workaround]
---

# Better Auth Cross-Domain Upload Workaround

When using convex-fs with Better Auth cross-domain plugin, the standard upload flow doesn't work. This doc explains why and provides the working solution.

---

## The Problem

**Stack:** Vite + React + Convex + Better Auth (cross-domain) + convex-fs

### Why Standard convex-fs Upload Fails

1. **Better Auth cross-domain uses localStorage, not cookies**
2. **convex-fs hardcodes CORS without credentials** (`Access-Control-Allow-Origin: *`)
3. **ctx.auth.getUserIdentity() returns null** with Better Auth

---

## The Solution

Create a custom `/upload` endpoint that:

1. Uses `corsRouter` from `convex-helpers` (supports `allowCredentials: true`)
2. Accepts auth token via custom header (`X-Better-Auth-Cookie`)
3. Manually verifies session via Better Auth API
4. Uses `fs.writeBlob()` directly

---

## Two-Layer Upload Protection

| Layer | Where | What it does |
|-------|-------|-------------|
| One-at-a-time | `/upload` HTTP action | Max 1 uncommitted upload per user |
| Rate limit | `commitFile` mutation | Max 10 commits per hour per user |

**Together:** Max 10 complete upload cycles per hour per user.

---

## Opportunistic Cleanup (No Cron)

Pending upload records need cleanup when they expire. Instead of a cron job, we use **opportunistic cleanup**:

**When a user uploads, first delete their expired records, then insert the new one.**

```typescript
export const registerPendingUpload = internalMutation({
  args: {
    blobId: v.string(),
    authUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Opportunistic cleanup: delete this user's expired pending uploads
    const userPending = await ctx.db
      .query("pending_uploads")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", args.authUserId))
      .collect();

    for (const record of userPending) {
      if (record.expiresAt < now) {
        await ctx.db.delete(record._id);
      }
    }

    // Insert new pending upload
    await ctx.db.insert("pending_uploads", {
      blobId: args.blobId,
      authUserId: args.authUserId,
      createdAt: now,
      expiresAt: now + PENDING_UPLOAD_TTL_MS,
    });
  },
});
```

### Why This Pattern

| Approach | Pros | Cons |
|----------|------|------|
| Cron job | Cleans all users | Runs even when app is idle |
| Opportunistic | Only runs on activity | Inactive users' records stay |

**Tradeoff accepted:** Records from users who never return stay forever. But they're tiny (a few string fields) and don't affect anything. If that user ever uploads again, their old expired records get cleaned up.

### Manual Cleanup (Optional)

If you ever want to clean up ALL expired records (e.g., inactive users):

```bash
npx convex run uploads:cleanupExpiredUploads
```

---

## Implementation Files

### convex/http.ts

```typescript
import { httpRouter, httpActionGeneric } from "convex/server";
import { corsRouter } from "convex-helpers/server/cors";
import { registerRoutes } from "convex-fs";
import { authComponent, createAuth } from "./auth";
import { components, internal } from "./_generated/api";
import { fs } from "./fs";

const http = httpRouter();

const allowedOrigins = [
  "http://localhost:5173",
  "https://yourapp.example.com",
];

authComponent.registerRoutes(http, createAuth, {
  cors: { allowedOrigins },
});

const uploadCors = corsRouter(http, {
  allowedOrigins,
  allowCredentials: true,
  allowedHeaders: ["Content-Type", "Content-Length", "X-Better-Auth-Cookie"],
});

uploadCors.route({
  path: "/upload",
  method: "POST",
  handler: httpActionGeneric(async (ctx, req) => {
    const authCookie = req.headers.get("X-Better-Auth-Cookie");
    if (!authCookie) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const headersWithCookie = new Headers(req.headers);
    headersWithCookie.set("Cookie", authCookie);

    const auth = createAuth(ctx as any);
    const session = await auth.api.getSession({ headers: headersWithCookie });

    if (!session) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // One-at-a-time check
    const hasPending = await ctx.runQuery(internal.uploads.hasPendingUpload, {
      authUserId: session.user.id,
    });
    if (hasPending) {
      return new Response(
        JSON.stringify({ error: "You have a pending upload. Please wait for it to complete." }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = await req.arrayBuffer();
    if (data.byteLength === 0) {
      return new Response(JSON.stringify({ error: "Empty file" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const MAX_SIZE = 50 * 1024 * 1024;
    if (data.byteLength > MAX_SIZE) {
      return new Response(JSON.stringify({ error: "File too large" }), {
        status: 413,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const contentType = req.headers.get("Content-Type") ?? "application/octet-stream";
      const blobId = await fs.writeBlob(ctx, data, contentType);

      // Registers pending + opportunistic cleanup
      await ctx.runMutation(internal.uploads.registerPendingUpload, {
        blobId,
        authUserId: session.user.id,
      });

      return new Response(JSON.stringify({ blobId }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Upload error:", error);
      return new Response(
        JSON.stringify({ error: error instanceof Error ? error.message : "Upload failed" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

registerRoutes(http, components.fs, fs, {
  pathPrefix: "/fs",
  uploadAuth: async () => false,
  downloadAuth: async (ctx, _blobId, path) => {
    if (path?.startsWith("/base/")) return true;
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;
    if (path?.startsWith(`/users/${identity.subject}/`)) return true;
    return false;
  },
});

export default http;
```

### convex/uploads.ts

```typescript
import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

const PENDING_UPLOAD_TTL_MS = 60 * 60 * 1000; // 1 hour

export const hasPendingUpload = internalQuery({
  args: { authUserId: v.string() },
  handler: async (ctx, args) => {
    const pending = await ctx.db
      .query("pending_uploads")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", args.authUserId))
      .first();
    return pending !== null;
  },
});

export const registerPendingUpload = internalMutation({
  args: { blobId: v.string(), authUserId: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Opportunistic cleanup: delete this user's expired pending uploads
    const userPending = await ctx.db
      .query("pending_uploads")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", args.authUserId))
      .collect();

    for (const record of userPending) {
      if (record.expiresAt < now) {
        await ctx.db.delete(record._id);
      }
    }

    await ctx.db.insert("pending_uploads", {
      blobId: args.blobId,
      authUserId: args.authUserId,
      createdAt: now,
      expiresAt: now + PENDING_UPLOAD_TTL_MS,
    });
  },
});

export const consumePendingUpload = internalMutation({
  args: { blobId: v.string(), authUserId: v.string() },
  handler: async (ctx, args) => {
    const pending = await ctx.db
      .query("pending_uploads")
      .withIndex("by_blobId", (q) => q.eq("blobId", args.blobId))
      .unique();

    if (!pending) return { valid: false, reason: "Upload not found or expired" };
    if (pending.authUserId !== args.authUserId) return { valid: false, reason: "Upload belongs to another user" };
    if (pending.expiresAt < Date.now()) {
      await ctx.db.delete(pending._id);
      return { valid: false, reason: "Upload expired" };
    }

    await ctx.db.delete(pending._id);
    return { valid: true };
  },
});

// Optional manual cleanup for inactive users
export const cleanupExpiredUploads = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expired = await ctx.db
      .query("pending_uploads")
      .withIndex("by_expiresAt")
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .collect();

    for (const record of expired) {
      await ctx.db.delete(record._id);
    }

    return { deleted: expired.length };
  },
});
```

### convex/schema.ts (pending_uploads)

```typescript
pending_uploads: defineTable({
  blobId: v.string(),
  authUserId: v.string(),
  createdAt: v.number(),
  expiresAt: v.number(),
})
  .index("by_blobId", ["blobId"])
  .index("by_authUserId", ["authUserId"])
  .index("by_expiresAt", ["expiresAt"]),
```

### convex/rateLimiter.ts

```typescript
fileUpload: { kind: "token bucket", rate: 10, period: HOUR, capacity: 5 },
```

---

## Complete Upload Flow

```
1. Client: POST /upload with X-Better-Auth-Cookie header
2. Server: Verify session via Better Auth API
3. Server: Check hasPendingUpload → reject if true (429)
4. Server: fs.writeBlob() → get blobId
5. Server: registerPendingUpload (cleanup expired + insert new)
6. Server: Return { blobId }
7. Client: Call commitFile mutation
8. Server: Check rate limit (10/hour)
9. Server: consumePendingUpload (verify ownership)
10. Server: Generate path server-side
11. Server: fs.commitFiles + insert file record
```

---

## Security Summary

| Issue | Solution |
|-------|----------|
| CORS incompatible with credentials | Custom endpoint with `corsRouter` |
| Browser blocks Cookie header | Custom `X-Better-Auth-Cookie` header |
| ctx.auth.getUserIdentity() null | `auth.api.getSession({ headers })` |
| Upload spam without commit | One-at-a-time check |
| Upload+commit spam | Rate limit (10/hour) |
| BlobId theft | Ownership tracking |
| Path injection | Server-side path generation |
| Expired records accumulation | Opportunistic cleanup |
