---
last_updated: 2026-01-31
updated_by: vector-projector
change: "Updated opportunistic cleanup - now cleans ALL expired records, not just current user"
status: tested
---

# File Storage

Implementation of file storage in Vector Projector using convex-fs with bunny.net.

**Status:** Implemented and tested for STL files. SVG follows same pattern.

---

## Client-Side Validation (Future)

**Important:** Files must be validated in the browser BEFORE upload is allowed.

| File Type | Validation Library | Purpose |
|-----------|-------------------|--------|
| STL | three.js `STLLoader` | Parse geometry, reject invalid files |
| SVG | [svgo](https://svgo.dev/docs/usage/browser/) | Sanitize, remove scripts/external refs |

**Rationale:**
- Prevents uploading renamed junk files (e.g., `malware.exe` → `malware.stl`)
- Catches corrupted/truncated files before wasting bandwidth
- Provides immediate user feedback
- Extracts real metadata (triangle count, dimensions) instead of trusting client

**See:** `/domains/vectorprojector/stl-upload.md` for full STL validation flow.

---

## Requirements

| Feature | Status | Notes |
|---------|--------|-------|
| Single file upload | Done | STL files working |
| Authenticated uploads | Done | Better Auth cross-domain workaround |
| File commit | Done | With ownership validation |
| File delete | Done | User files + admin base files |
| Signed URLs | Done | Via convex-fs download routes |
| Base samples | Done | Admin upload, public download |
| Rate limiting | Done | 10/hour at /upload endpoint |
| BlobId theft prevention | Done | Pending uploads tracking |
| Path injection prevention | Done | Server-side path generation |
| One-upload-at-a-time | Done | Prevents upload spam |
| Expired record cleanup | Done | Opportunistic on every upload |
| Client-side validation | Not started | three.js for STL, svgo for SVG |

---

## Critical: Better Auth Cross-Domain

The standard convex-fs upload flow **does not work** with Better Auth cross-domain plugin.

**See:** `/core/05-storage/better-auth-upload-workaround.md`

### Why It Fails

1. Better Auth cross-domain stores tokens in localStorage, not cookies
2. convex-fs hardcodes `Access-Control-Allow-Origin: *` (incompatible with credentials)
3. `ctx.auth.getUserIdentity()` returns null (Better Auth uses different session)

### The Solution

Custom `/upload` endpoint using `corsRouter` from `convex-helpers`. Full details in the linked doc.

---

## File Types

| Type | Extension | Max Size | Per-User Limit |
|------|-----------|----------|----------------|
| STL | `.stl` | 50 MB | 100 files |
| SVG | `.svg` | 20 KB | 250 files |

**Note:** Base samples (admin uploads) don't count against user limits.

---

## Two Content Types

| Type | Uploaded by | Path prefix | Visible to | Purpose |
|------|-------------|-------------|------------|--------|
| User files | Users | `/users/{subject}/` | Owner only | Personal library |
| Base samples | Admins | `/base/` | Everyone | Discovery mode |

---

## Setup (Completed)

### Files Created

| File | Purpose |
|------|--------|
| `convex/convex.config.ts` | Registers convex-fs component |
| `convex/fs.ts` | ConvexFS instance with bunny.net config |
| `convex/http.ts` | Custom /upload endpoint + convex-fs download routes |
| `convex/uploads.ts` | Pending upload tracking + rate limit + cleanup |
| `convex/stlFiles.ts` | STL file mutations with security checks |
| `convex/schema.ts` | pending_uploads + stl_files tables |

### Environment Variables (Convex Dashboard)

```
BUNNY_STORAGE_ZONE=vector-projector
BUNNY_CDN_HOSTNAME=https://vector-projector-cdn.b-cdn.net
BUNNY_TOKEN_KEY=(from token auth screen)
BUNNY_API_KEY=(from FTP & API access)
BUNNY_REGION=ny
```

---

## Architecture

### Upload Flow

```
1. Client: User selects file
2. Client: Validate with STLLoader (future - parse, check structure)
3. Client: If invalid → show error, stop
4. Client: authClient.getCookie() → get Better Auth token
5. Client: POST /upload with X-Better-Auth-Cookie header + file body
6. Server: Verify session via auth.api.getSession({ headers })
7. Server: Check one-upload-at-a-time (reject if pending exists)
8. Server: Rate limit check (10/hour) ← BEFORE writing blob
9. Server: fs.writeBlob() → get blobId
10. Server: registerPendingUpload:
    - Clean up ALL expired records (any user)
    - Insert new pending record
11. Server: Return { blobId }
12. Client: Call commitFile mutation with blobId + metadata
13. Server: consumePendingUpload → verify ownership
14. Server: Generate path SERVER-SIDE (never trust client)
15. Server: fs.commitFiles([{ path, blobId }])
16. Server: Insert stl_files record
```

**Key:** Rate limiting at step 8, cleanup at step 10, both BEFORE returning blobId.

### Download Flow

```
1. Client: Has file path from stl_files record
2. Client: Constructs URL: ${CONVEX_SITE_URL}/fs${path}
3. Server: downloadAuth callback checks:
   - /base/* → allow (public)
   - /users/{subject}/* → check identity matches
4. Server: Returns 302 redirect to signed CDN URL
5. Browser: Downloads from bunny.net CDN
```

---

## Security Measures

### 1. Rate Limiting at Upload

**Problem:** User could spam uploads to fill storage (even without committing).

**Solution:** Rate limit at `/upload` HTTP endpoint, BEFORE writing blob.

### 2. One-Upload-At-A-Time

**Problem:** User could spam uploads without committing.

**Solution:** Check for existing pending upload before accepting new one.

### 3. Opportunistic Cleanup (All Users)

**Problem:** Expired pending records could accumulate from inactive users.

**Solution:** Every upload triggers cleanup of ALL expired records, not just current user's.

```typescript
// In registerPendingUpload:
const expired = await ctx.db
  .query("pending_uploads")
  .withIndex("by_expiresAt")
  .filter((q) => q.lt(q.field("expiresAt"), now))
  .collect();

for (const record of expired) {
  await ctx.db.delete(record._id);
}
```

**Result:** As long as someone uploads occasionally, all expired records get cleaned. No cron job needed.

### 4. BlobId Ownership Tracking

**Problem:** Window between upload and commit where attacker could steal blobId.

**Solution:** `pending_uploads` table tracks who uploaded each blob. Validated at commit time.

### 5. Server-Side Path Generation

**Problem:** Client-provided paths enable path traversal, overwriting, bypassing restrictions.

**Solution:** Path is ALWAYS generated server-side.

### 6. Client-Side Validation (Future)

**Problem:** Users can upload any file renamed to `.stl`.

**Solution:** Parse with three.js STLLoader before allowing upload.

### 7. Admin Validation for Base Files

**Problem:** Client could send `isBase: true` to bypass quotas.

**Solution:** Always validate against `admins` table server-side.

---

## Untrusted Client Data

| Field | Source | Trust Level | Notes |
|-------|--------|-------------|-------|
| `fileSize` | Client | Untrusted | Display only. Get real size from validation. |
| `fileName` | Client | Untrusted | Display only. Sanitize before showing. |
| `name` | Client | Untrusted | User-provided display name. |
| `triangleCount` | Validation | Trusted | From STLLoader parse (future). |
| `boundingBox` | Validation | Trusted | From STLLoader parse (future). |

---

## Path Convention

### User Files

```
/users/{identity.subject}/stl/{uuid}.stl
/users/{identity.subject}/svg/{uuid}.svg
```

### Base Samples

```
/base/stl/{uuid}.stl
/base/svg/{uuid}.svg
```

---

## What's Not Implemented Yet

| Feature | Status |
|---------|--------|
| Client-side STL validation | Not started |
| Client-side SVG validation | Not started |
| Thumbnail generation | Not started |
| SVG file upload | Not started |
| User file upload (non-admin) | Not started |
| Quota enforcement | Not started |

---

## Related Docs

- `/domains/vectorprojector/stl-upload.md` - Full STL validation flow
- `/core/03-convex/rate-limiting.md` - Rate limiting patterns
- `/core/05-storage/better-auth-upload-workaround.md` - Full workaround details
- `/core/05-storage/convex-fs.md` - General convex-fs overview
- `/core/05-storage/bunny-setup.md` - Bunny.net configuration