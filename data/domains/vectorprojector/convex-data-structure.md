---
last_updated: 2026-01-31
updated_by: vector-projector
change: "Added pending_uploads table for upload security"
status: tested
---

# Convex Data Structure

Tables and fields for Vector Projector.

---

## Tables Overview

### Core Tables (from auth/app setup)

| Table | Purpose |
|-------|--------|
| `users` | App user data, links to Better Auth |
| `admins` | Email whitelist for admin privileges |
| `alerts` | Admin broadcast messages |
| `app_state` | App-wide config (singleton) |
| `crowdfunding_backers` | Backer verification for early access |

### Vector Projector Tables

| Table | Scope | Limit |
|-------|-------|-------|
| `pending_uploads` | System (security) | Auto-cleanup |
| `stl_files` | Per user + base samples | 100 per user |
| `svg_files` | Per user + base samples | 250 per user |
| `projects` | Per user | 100 per user |

---

## Core Tables Reference

### admins

Email whitelist. Users whose emails appear here have admin privileges.

| Column | Purpose |
|--------|--------|
| email | Email address (lookup key) |
| addedAt | Timestamp |
| note | Optional reason/note |

**Index:** `by_email`

**Usage:** Check if user is admin by querying this table with their email.

### users

App-specific user data. Links to Better Auth via `authUserId`.

| Column | Purpose |
|--------|--------|
| authUserId | Better Auth user ID |
| email | User's email |
| name | Optional display name |
| createdAt | Timestamp |
| activeSessionId | Session enforcement |
| sessionStartedAt | Session enforcement |
| crowdfundingBackerId | Link to backer record |
| lastSeenAlertAt | Alert read tracking |

### alerts

Admin broadcast messages to all users.

| Column | Purpose |
|--------|--------|
| message | Alert text |
| createdAt | Timestamp |
| createdBy | Admin who sent it |

### app_state

Singleton for app-wide configuration.

| Column | Purpose |
|--------|--------|
| key | Always "config" |
| crowdfundingActive | Feature flag |

---

## pending_uploads (Security)

Tracks blob ownership between upload and commit. Prevents blobId theft.

**See:** `/core/05-storage/better-auth-upload-workaround.md`

| Column | Type | Purpose |
|--------|------|--------|
| blobId | string | From convex-fs upload |
| authUserId | string | Better Auth user ID who uploaded |
| createdAt | number | Timestamp |
| expiresAt | number | Auto-cleanup after this time |

**Indexes:**
- `by_blobId` - lookup when validating commit
- `by_expiresAt` - cleanup expired records

**Lifecycle:**
1. Created when blob uploaded to `/upload` endpoint
2. Deleted when `commitFile` consumes it (one-time use)
3. Expired records cleaned up by scheduled job

**TTL:** 1 hour (generous buffer for slow commits)

**Schema:**

```typescript
pending_uploads: defineTable({
  blobId: v.string(),
  authUserId: v.string(),
  createdAt: v.number(),
  expiresAt: v.number(),
})
  .index("by_blobId", ["blobId"])
  .index("by_expiresAt", ["expiresAt"]),
```

---

## Discovery Mode

New users (anonymous, not signed in) can explore the app before signing up.

### What Anonymous Users Can Do

- See sample STL models (base content)
- See sample SVG files (base content)
- Load samples into the viewer
- Manipulate, position, extrude - full tool access
- Experience the core workflow

### What Anonymous Users Cannot Do

- Upload their own files
- Save projects
- Load projects

### Sign Up Prompt

When anonymous user tries to save → prompt to sign up.

---

## Base Samples (Admin Content)

Admins can upload sample STL and SVG files for discovery mode.

### Rules

| Rule | Detail |
|------|--------|
| Upload | Admin only, via admin panel |
| Owner | The admin who uploaded (audit trail) |
| Flag | `isBase: true` marks as sample content |
| Path | `/base/stl/{uuid}.stl` or `/base/svg/{uuid}.svg` |
| Visibility | Everyone, including anonymous |
| UI placement | Separate "Samples" section, not mixed with user library |
| Limits | Base files don't count against user quotas |

### Server-Side Admin Validation

**Critical:** Never trust `isBase` flag from client. Always validate server-side.

```typescript
// In commitFile mutation:
if (args.isBase) {
  const adminRecord = await ctx.db
    .query("admins")
    .withIndex("by_email", (q) => q.eq("email", appUser.email))
    .unique();
  if (!adminRecord) {
    throw new Error("Only admins can upload base samples");
  }
  // Generate base path
  path = `/base/stl/${crypto.randomUUID()}.stl`;
} else {
  // Generate user path
  path = `/users/${identity.subject}/stl/${crypto.randomUUID()}.stl`;
}
```

### Authorization

```typescript
downloadAuth: async (ctx, _blobId, path) => {
  if (path?.startsWith("/base/")) return true; // Public
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return false;
  if (path?.startsWith(`/users/${identity.subject}/`)) return true; // Owner
  return false;
}
```

### Download Security

The `downloadAuth` callback doesn't have access to IP/headers, so we can't rate limit at the Convex level for anonymous users.

**Solution:** Use Bunny.net's built-in protections (configured in Bunny dashboard):

| Protection | What it does |
|------------|-------------|
| Bunny Shield (free) | WAF, rate limiting per IP/path |
| Hotlink protection | Allowlist our domains as valid referrers |
| DDoS protection | Automatic, always-on |

This is actually better - stops abuse at the CDN edge before it reaches Convex.

---

## stl_files

User's library of 3D models, plus admin-uploaded base samples.

| Column | Type | Purpose |
|--------|------|--------|
| userId | id → users | Pointer to owner (user or admin) |
| path | string | Convex-fs path (generated server-side) |
| fileName | string | Original filename for reference |
| name | string | User-defined display name |
| fileSize | number | Bytes, for quota tracking |
| isBase | boolean | True for admin samples |
| createdAt | number | Timestamp |

**Indexes:**
- `by_userId` - list user's files
- `by_isBase` - list base samples for discovery mode

**Path convention:**
- User files: `/users/{identity.subject}/stl/{uuid}.stl`
- Base files: `/base/stl/{uuid}.stl`

**Limit:** 100 per user (base files don't count).

**Schema:**

```typescript
stl_files: defineTable({
  userId: v.id("users"),
  path: v.string(),
  fileName: v.string(),
  name: v.string(),
  fileSize: v.number(),
  isBase: v.boolean(),
  createdAt: v.number(),
})
  .index("by_userId", ["userId"])
  .index("by_isBase", ["isBase"]),
```

---

## svg_files

User's library of vector artwork, plus admin-uploaded base samples.

| Column | Type | Purpose |
|--------|------|--------|
| userId | id → users | Pointer to owner (user or admin) |
| path | string | Convex-fs path |
| fileName | string | Original filename for reference |
| name | string | User-defined display name |
| fileSize | number | Bytes, for quota tracking |
| isBase | boolean | True for admin samples |
| createdAt | number | Timestamp |

**Indexes:**
- `by_userId` - list user's files
- `by_isBase` - list base samples

**Path convention:**
- User files: `/users/{identity.subject}/svg/{uuid}.svg`
- Base files: `/base/svg/{uuid}.svg`

**Limit:** 250 per user (base files don't count).

**Schema:**

```typescript
svg_files: defineTable({
  userId: v.id("users"),
  path: v.string(),
  fileName: v.string(),
  name: v.string(),
  fileSize: v.number(),
  isBase: v.boolean(),
  createdAt: v.number(),
})
  .index("by_userId", ["userId"])
  .index("by_isBase", ["isBase"]),
```

---

## projects

Where the magic happens. Each project combines one STL with extrusion planes.

**Only authenticated users can have projects.**

| Column | Type | Purpose |
|--------|------|--------|
| userId | id → users | Pointer to owner |
| name | string | Project name |
| createdAt | number | Timestamp |
| updatedAt | number | Timestamp |
| stlFileId | optional id → stl_files | Can be user file OR base file |
| stlOrientation | optional object | Rotation + zOffset |
| extrusionPlanes | array | Max 10 planes |

**Limit:** 100 per user.

**Note:** Projects can reference base files directly. No copying required.

---

## Ownership Hierarchy

The extrusionPlane is a self-contained unit. Everything downstream lives with the plane that owns it.

```
project
├── stlFileId (optional, can be user file or base file)
├── stlOrientation
│   ├── rotation (quaternion: x, y, z, w)
│   └── zOffset (mm to build plate)
│
└── extrusionPlanes[] (max 10)
    │
    ├── planeData
    │   ├── outer (polygon points)
    │   ├── holes (array of polygon points)
    │   └── planeZ (height of plane)
    │
    ├── name (user-defined label for the plane)
    │
    ├── svgFileId (optional, can be user file or base file)
    │
    ├── svgSettings (only if svgFileId set)
    │   ├── scale
    │   ├── rotation
    │   └── position (x, y on plane)
    │
    └── svgShapes[] (only if svgFileId set)
        │
        ├── shapeIndex (0, 1, 2... matches boolean output order)
        ├── name (user-defined: "circleLeft", "overlap", etc.)
        └── extrusionSettings
            └── height (mm)
```

---

## Deterministic Shape Matching

The SVG boolean process is deterministic: same inputs always produce same outputs in the same order.

**What this means:**
- We do NOT store computed geometry
- We only store metadata (name, extrusion settings) linked by shapeIndex
- On project load: run booleans → get ordered shapes → match by index → apply stored settings

**Why this works:**
- Boolean inputs: SVG file + svgSettings (scale, rot, pos) + planeData
- These inputs are stored in the project
- Same inputs → same shape order → indexes are stable

---

## Admin Panel: Base Content Management

Admins need UI to:
- Upload sample STL files
- Upload sample SVG files
- View/delete existing samples
- See which admin uploaded each sample

**Status:** STL upload implemented in `src/components/admin/sections/BaseStlSection.tsx`

---

## Open Questions

1. What fields go in extrusionSettings besides height?
2. What fields go in svgSettings besides scale/rotation/position?
3. Max number of svgShapes per extrusionPlane? (result of boolean, software-enforced)
4. Do we need sortOrder for extrusionPlanes, or is array order enough?
5. How many base samples should we start with? (Minimum viable for discovery)

---

## Implementation Status

| Table | Status |
|-------|--------|
| pending_uploads | Done |
| stl_files | Done (with mutations) |
| svg_files | Schema done, mutations not started |
| projects | Schema done, mutations not started |

---

## Next Steps

1. Implement SVG upload (same pattern as STL)
2. Implement user file upload (non-admin)
3. Add quota enforcement
4. Add cleanup scheduled job for pending_uploads
5. Start on projects mutations
