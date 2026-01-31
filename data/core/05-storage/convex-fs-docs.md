---
last_updated: 2026-01-31
updated_by: vector-projector
change: "Added GitHub repo link, clarified upload/commit architecture"
status: tested
---

# Convex-FS Docs

Reference to all convex-fs documentation pages with summaries.

**Root:** https://convexfs.dev/

**GitHub:** https://github.com/jamwt/convex-fs

---

## Key Architecture Insight

convex-fs intentionally separates upload from commit:

| Step | What Happens | Where |
|------|--------------|-------|
| Upload | Bytes go to bunny.net storage, get blobId | HTTP endpoint |
| Commit | Associate blobId with a path in your app | Your mutation |

**Why separate?**
- Upload is data plane (large bytes to CDN)
- Commit is control plane (metadata in Convex DB)
- Allows retry/recovery if commit fails
- Flexibility in path naming after upload

**Built-in GC:**
- convex-fs tracks pending uploads internally
- Uncommitted uploads auto-expire after 4 hours
- GC job deletes expired blobs from storage
- You don't need your own cleanup for abandoned uploads

**What convex-fs does NOT provide:**
- Rate limiting (add in your HTTP action or uploadAuth callback)
- User ownership tracking (the component doesn't know about users)
- File size limits (enforce in your HTTP action)

**Your responsibility:**
- Validate user in `uploadAuth` callback
- Add rate limiting / abuse prevention
- Track user ownership if needed (for multi-user apps)
- Enforce file size limits
- Add business logic in your `commitFile` mutation

---

## Get Started

| Page | URL |
|------|-----|
| Introduction | https://convexfs.dev/get-started/introduction/ |
| Setup Bunny | https://convexfs.dev/get-started/setup-bunny/ |
| Example App | https://convexfs.dev/get-started/example-app/ |

**Introduction:** Overview of convex-fs architecture. Metadata in Convex, blobs in Bunny.net. Path-based organization like S3.

**Setup Bunny:** Step-by-step bunny.net account setup. Storage zone, pull zone, security settings, gathering env vars. Region codes: de (default), ny, sg, uk, la, se, br, jh, syd.

**Example App:** Clone-and-run demo. Shows npm run dev runs both Vite and Convex. Dashboard-first env var configuration.

**Example Code:** See https://github.com/jamwt/convex-fs/tree/main/example for a working reference implementation.

---

## Guides

### Setup & Configuration

| Page | URL |
|------|-----|
| App Setup | https://convexfs.dev/guides/app-setup/ |
| Advanced Configuration | https://convexfs.dev/guides/advanced-configuration/ |
| Prod/Dev Environments | https://convexfs.dev/guides/prod-dev-environments/ |

**App Setup:** Install `convex-fs`, create `convex.config.ts`, create `convex/fs.ts` with ConvexFS instance, add routes to `http.ts`. Critical setup file.

**Advanced Configuration:** All config options. `downloadUrlTtl` (default 3600s), `blobGracePeriod` (default 86400s), `pathPrefix` (default /fs). Multiple filesystem instances possible.

**Prod/Dev Environments:** Separate storage zones for prod vs dev. Dev zones get orphaned blobs when deployments terminate. Rotate/wipe quarterly.

---

### Core Operations

| Page | URL |
|------|-----|
| Uploading Files | https://convexfs.dev/guides/uploading-files/ |
| Serving Files | https://convexfs.dev/guides/serving-files/ |
| Filesystem Operations | https://convexfs.dev/guides/filesystem-operations/ |

**Uploading Files:** POST to /fs/upload → get blobId → call commitFiles mutation. Any UTF-8 string is valid path.

**Serving Files:** fs.stat() to get metadata, buildDownloadUrl() to create signed URL, endpoint returns 302 redirect to CDN. Token is single-use.

**Filesystem Operations:** All methods documented.
- Queries: `stat(path)`, `list(prefix)`
- Mutations: `delete(path)`, `move(src,dest)`, `copy(src,dest)`
- Actions: `getFile(path)`, `writeFile(path,data,type)`, `getBlob(id)`, `writeBlob(data,type)`
- `delete()` is idempotent, succeeds on non-existent files

---

### Security

| Page | URL |
|------|-----|
| Authn & Authz | https://convexfs.dev/guides/authn-authz/ |

**Authn & Authz:** CRITICAL doc. `uploadAuth` and `downloadAuth` callbacks. Path-based authorization using `identity.subject`. Signed URL lifetime considerations. Once URL issued, access continues until expiry even if revoked.

---

### Advanced Features

| Page | URL |
|------|-----|
| CDN Parameters | https://convexfs.dev/guides/cdn-parameters/ |
| Transactions & Atomicity | https://convexfs.dev/guides/transactions-atomicity/ |
| File Expiration | https://convexfs.dev/guides/file-expiration/ |

**CDN Parameters:** Pass extra params to Bunny.net Edge Rules. Use case: custom download filenames via Content-Disposition header. Params included in signature when token auth enabled.

**Transactions & Atomicity:** Preconditions prevent data races. `transact()` for atomic multi-file ops. `commitFiles()` supports compare-and-swap. Conflict codes: SOURCE_NOT_FOUND, SOURCE_CHANGED, DEST_EXISTS, etc. Probably overkill for single-user scenarios.

**File Expiration:** Auto-delete files via `expiresAt` attribute. File GC runs every 15 seconds. Use cases: temporary staging, time-limited sharing, session cleanup. Attributes don't persist across move/copy.

---

### Maintenance

| Page | URL |
|------|-----|
| Garbage Collection | https://convexfs.dev/guides/garbage-collection/ |
| Admin Tools | https://convexfs.dev/guides/admin-tools/ |

**Garbage Collection:** Three GC jobs.
- Upload GC (hourly :00): uncommitted uploads after 4 hours
- Blob GC (hourly :20): orphaned blobs after grace period
- File GC (every 15s): expired file records
Soft delete = immediate record removal, blob stays until grace period.

**Admin Tools:** `clearAllFiles` (disabled in prod by default). Freeze GC with `freezeGc: true` in config. Restore orphaned blobs via `internal.ops.basics.restore`. Query blobs table for `refCount: 0` to find orphans.

---

## Key Pages by Task

| Task | Start Here |
|------|------------|
| Initial setup | App Setup, Setup Bunny |
| Implement uploads | Uploading Files |
| Implement downloads | Serving Files |
| Secure files | **Authn & Authz** |
| Delete files | Filesystem Operations, Garbage Collection |
| Custom filenames | CDN Parameters |
| Temporary files | File Expiration |
| Production deploy | Prod/Dev Environments |
| Disaster recovery | Admin Tools, Garbage Collection |

---

## Quick Reference

### Config Options

| Option | Default | Purpose |
|--------|---------|--------|
| `downloadUrlTtl` | 3600s | Signed URL lifetime |
| `blobGracePeriod` | 86400s | Time before orphan deletion |
| `pathPrefix` | `/fs` | HTTP route prefix |

### Region Codes

`de` (Frankfurt, default), `ny` (New York), `sg` (Singapore), `uk`, `la`, `se`, `br`, `jh`, `syd`

### Key Methods

| Method | Type | Purpose |
|--------|------|--------|
| `fs.stat(path)` | Query | Get file metadata |
| `fs.list(prefix)` | Query | List files |
| `fs.delete(path)` | Mutation | Soft delete |
| `fs.commitFiles([...])` | Mutation | Commit uploaded blobs |
| `fs.writeBlob(data, type)` | Action | Upload blob directly |
| `buildDownloadUrl(...)` | Helper | Create signed URL |

### Internal Tables (in convex-fs component)

| Table | Purpose |
|-------|--------|
| `uploads` | Pending uploads awaiting commit (4h TTL) |
| `blobs` | Committed blobs with refCount |
| `files` | Path → blobId mapping |
| `config` | Stored config for background GC |
