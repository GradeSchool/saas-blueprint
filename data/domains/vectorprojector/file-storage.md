---
last_updated: 2026-01-30
updated_by: vector-projector
change: "Added CDN security section for download protection"
status: draft
---

# File Storage

Working doc for implementing file storage in Vector Projector using convex-fs.

---

## Requirements

| Feature | Needed | Notes |
|---------|--------|-------|
| Single file upload | Yes | STL and SVG files |
| Batch upload | No | One file at a time |
| File copy | No | Not needed |
| File delete | Yes | User can remove files from library |
| Signed URLs | Yes | Secure, time-limited access |
| Base samples | Yes | Admin uploads for discovery mode |

---

## File Types

| Type | Extension | Max Size | Per-User Limit |
|------|-----------|----------|----------------|
| STL | `.stl` | 5 MB | 100 files |
| SVG | `.svg` | 20 KB | 250 files |

**Note:** Base samples (admin uploads) don't count against user limits.

---

## Two Content Types

| Type | Uploaded by | Path prefix | Visible to | Purpose |
|------|-------------|-------------|------------|---------|
| User files | Users | `/users/{subject}/` | Owner only | Personal library |
| Base samples | Admins | `/base/` | Everyone (incl. anonymous) | Discovery mode |

---

## Setup

### Install Package

```bash
npm i convex-fs
```

### Files to Create/Modify

**1. `convex/convex.config.ts`** - Register component

```typescript
import { defineApp } from "convex/server";
import fs from "convex-fs/convex.config.js";

const app = defineApp();
app.use(fs);
export default app;
```

**2. `convex/fs.ts`** - Create ConvexFS instance

```typescript
import { ConvexFS } from "convex-fs";
import { components } from "./_generated/api";

export const fs = new ConvexFS(components.fs, {
  storage: {
    type: "bunny",
    apiKey: process.env.BUNNY_API_KEY!,
    storageZoneName: process.env.BUNNY_STORAGE_ZONE!,
    region: process.env.BUNNY_REGION,
    cdnHostname: process.env.BUNNY_CDN_HOSTNAME!,
    tokenKey: process.env.BUNNY_TOKEN_KEY,
  },
  downloadUrlTtl: 300,      // 5 minutes
  blobGracePeriod: 86400,   // 24 hours
});
```

**3. `convex/http.ts`** - Add routes to EXISTING file

We already have http.ts for Better Auth. Add convex-fs routes to the same file:

```typescript
import { registerRoutes } from "convex-fs";
import { fs } from "./fs";

// ... existing Better Auth setup ...

registerRoutes(http, components.fs, fs, {
  pathPrefix: "/fs",
  uploadAuth: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    return identity !== null;
  },
  downloadAuth: async (ctx, blobId, path, extraParams) => {
    // Base content is public (discovery mode)
    if (path?.startsWith('/base/')) return true;
    
    // User content requires auth + ownership
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;
    if (path?.startsWith(`/users/${identity.subject}/`)) return true;
    
    return false;
  },
});
```

---

## API Methods

All methods called on the `fs` instance.

### Queries/Mutations

| Method | Type | Parameters | Returns | Notes |
|--------|------|------------|---------|-------|
| `stat(path)` | Query | path: string | metadata or null | Get file info |
| `list(prefix)` | Query | prefix?: string | paginated array | List files |
| `delete(path)` | Mutation | path: string | void | Soft delete, idempotent |
| `move(src, dest)` | Mutation | paths: string | void | Atomic, fails if dest exists |
| `copy(src, dest)` | Mutation | paths: string | void | Reference counted |

### Actions (Server-Side Only)

| Method | Parameters | Returns | Notes |
|--------|------------|---------|-------|
| `getFile(path)` | path: string | { data, contentType, size } | Download file contents |
| `writeFile(path, data, contentType)` | path, ArrayBuffer, string | void | Write directly |
| `getBlob(blobId)` | blobId: string | ArrayBuffer or null | Low-level |
| `writeBlob(data, contentType)` | ArrayBuffer, string | blobId | Needs commitFiles after |

### Transactions

| Method | Parameters | Notes |
|--------|------------|-------|
| `commitFiles([{path, blobId}])` | array of path/blobId pairs | Commit uploaded blobs |
| `transact(ops)` | array of operations | Atomic multi-file ops |

---

## Configuration Options

| Option | Default | Purpose |
|--------|---------|--------|
| `downloadUrlTtl` | 3600 (1 hour) | Signed URL lifetime in seconds |
| `blobGracePeriod` | 86400 (24 hours) | Time before orphaned blobs deleted |
| `pathPrefix` | `/fs` | URL prefix for HTTP routes |

**Our settings:**
- `downloadUrlTtl`: 300 (5 minutes) - tighter security
- `blobGracePeriod`: 86400 (24 hours) - default is fine

---

## Path Convention

Within the `vector-projector` storage zone:

### User Files

```
/users/{identity.subject}/stl/{fileId}.stl
/users/{identity.subject}/svg/{fileId}.svg
```

**Example:**
```
/users/k5741x0swzqctg389fbhycyz5x802m8g/stl/abc123.stl
```

### Base Samples (Admin Content)

```
/base/stl/{fileId}.stl
/base/svg/{fileId}.svg
```

**Example:**
```
/base/stl/sample-cube.stl
/base/svg/sample-logo.svg
```

### How to Find identity.subject Value

1. Open Convex Dashboard
2. Go to **Data** tab
3. Find the **betterAuth** component (group of tables)
4. Open the **user** table
5. Look at the `_id` column - that value is what `identity.subject` returns

---

## Authorization

Based on [convex-fs authn/authz guide](https://convexfs.dev/guides/authn-authz/).

### Upload Auth

Gates all uploads. Must be authenticated.

Additional checks in commit mutation:
- **User uploads:** quota limits, file type validation
- **Admin uploads to /base/:** must be admin (check against admins table)

### Download Auth

| Path | Auth Required | Who Can Access |
|------|---------------|----------------|
| `/base/*` | No | Everyone (public) |
| `/users/{subject}/*` | Yes | Owner only |

Path encodes ownership for user files. Base files are public for discovery mode.

### Signed URL Lifetime

Using 300 seconds (5 minutes). Tradeoff:
- Shorter: Tighter control, more backend requests
- Longer: Better UX, wider revocation window

---

## Download Security (CDN-Level)

The `downloadAuth` callback doesn't have access to IP addresses or HTTP headers, so we cannot implement Convex-level rate limiting for anonymous downloads.

**Solution:** Use Bunny.net's built-in protections at the CDN edge.

### Bunny.net Security Features

| Feature | What it does | Cost |
|---------|--------------|------|
| DDoS protection | Automatic, always-on, 250 Tbps+ | Included |
| Bunny Shield | WAF, rate limiting per IP/path | $0/month (basic) |
| Hotlink protection | Allowlist valid referrers | Included |
| Rate limiting | Limit requests per IP/path/time | Part of Shield |

### Recommended Configuration

In Bunny.net dashboard for `vector-projector-cdn` pull zone:

1. **Enable Bunny Shield** (free tier)
2. **Configure rate limiting** - e.g., 100 requests/minute per IP
3. **Enable hotlink protection** - add allowed referrers:
   - `vectorprojector.weheart.art`
   - `localhost:5173` (dev)
4. **DDoS protection** - already on by default

### Why CDN-Level is Better

- Stops abuse before it reaches Convex
- No additional latency for legitimate users
- Bunny handles the heavy lifting
- More sophisticated detection (AI-based)

**References:**
- [Bunny Shield](https://bunny.net/shield/)
- [Hotlink Protection](https://support.bunny.net/hc/en-us/articles/360000236671-How-to-set-up-hotlinking-protection)
- [Rate Limiting](https://docs.bunny.net/docs/shield-rate-limiting)

---

## Convex-FS Data Model

Files are identified by **path**, not Convex storage ID.

### Upload Flow

```
1. Browser POSTs file to /fs/upload
2. Convex-fs returns { blobId: "UUID" }
3. App calls mutation with fs.commitFiles(ctx, [{ path, blobId }])
```

### Serving Flow

```
1. Query: fs.stat(ctx, path) → get file info including blobId
2. Build URL: buildDownloadUrl(siteUrl, "/fs", blobId, path)
3. URL returns 302 redirect to signed CDN URL
```

### Delete Flow

```
1. Call fs.delete(ctx, path)
2. File record removed immediately from files table
3. Blob refCount decremented
4. When refCount reaches 0, blob is "orphaned"
5. After grace period (24h), blob GC permanently deletes
```

---

## Garbage Collection

Three GC routines run automatically:

| GC | Schedule | Purpose |
|----|----------|--------|
| Upload GC | Hourly at :00 | Remove uncommitted uploads (after 4 hours) |
| Blob GC | Hourly at :20 | Delete orphaned blobs (after grace period) |
| File GC | Every 15 seconds | Delete expired file records |

---

## Prod vs Dev Environments

Recommended: **Separate storage zones**

| Environment | Storage Zone | Notes |
|-------------|--------------|-------|
| Production | `vector-projector` | Locked down, real data |
| Dev/CI | `vector-projector-dev` | Shared, test data, periodic wipe |

**Caveat:** Orphaned blobs in dev zone persist after deployments terminate. Rotate/wipe quarterly.

---

## Schema Implications

With convex-fs, we store the **path** instead of Convex storage ID.

### stl_files

| Column | Type | Notes |
|--------|------|-------|
| userId | id → users | Owner (user or admin who uploaded) |
| path | string | Convex-fs path |
| fileName | string | Original filename |
| name | string | User-defined display name |
| fileSize | number | Bytes, for quota tracking |
| isBase | boolean | True for admin samples |
| createdAt | number | Timestamp |

### svg_files

Same structure as stl_files.

---

## Implementation Tasks

### Setup

- [ ] Install convex-fs package
- [ ] Create `convex/fs.ts` with ConvexFS instance
- [ ] Update `convex/convex.config.ts` to register component
- [ ] Update `convex/http.ts` to add convex-fs routes with base/user auth
- [ ] Add bunny env vars to Convex dashboard
- [ ] Configure Bunny Shield and hotlink protection
- [ ] Test upload/download flow

### User Upload

- [ ] Create commitFile mutation (validates user, checks quota, saves to our table)
- [ ] Frontend: file picker, POST to /fs/upload, call commit mutation

### Admin Upload (Base Content)

- [ ] Create admin-only commitBaseFile mutation
- [ ] Check user is in admins table
- [ ] Path uses `/base/` prefix
- [ ] Set `isBase: true` in database record
- [ ] Admin panel UI for uploading samples

### Serve

- [ ] Create getFileUrl query using buildDownloadUrl
- [ ] Works for both user files and base files
- [ ] Frontend: fetch URL when needed, display/use file

### Delete

- [ ] Create deleteFile mutation (calls fs.delete, removes from our table)
- [ ] User can delete own files
- [ ] Admin can delete base files
- [ ] Frontend: delete button in library / admin panel

### Quota Enforcement

- [ ] Check file count before allowing commit (user files only)
- [ ] Check file size before allowing upload
- [ ] Base files don't count against quota
- [ ] Return clear error if quota exceeded

---

## Open Questions

1. Do we need to store fileSize, or can we get it from fs.stat()?
2. How to handle upload errors / partial uploads?
3. Should we create a dev storage zone now or later?

---

## References

- [convexfs.dev](https://convexfs.dev/)
- [App Setup](https://convexfs.dev/guides/app-setup/)
- [Uploading files](https://convexfs.dev/guides/uploading-files/)
- [Serving files](https://convexfs.dev/guides/serving-files/)
- [Filesystem Operations](https://convexfs.dev/guides/filesystem-operations/)
- [Authn & Authz](https://convexfs.dev/guides/authn-authz/)
- [Garbage Collection](https://convexfs.dev/guides/garbage-collection/)
- [Prod/Dev Environments](https://convexfs.dev/guides/prod-dev-environments/)
- [Advanced Configuration](https://convexfs.dev/guides/advanced-configuration/)
- [Bunny Shield](https://bunny.net/shield/)
- [Bunny Hotlink Protection](https://support.bunny.net/hc/en-us/articles/360000236671-How-to-set-up-hotlinking-protection)
