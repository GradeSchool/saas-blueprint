---
last_updated: 2026-02-10
updated_by: vector-projector
change: "Added pricing_catalog table, backer access fields on users, fixed pending_uploads index"
status: tested
tldr: "Vector Projector Convex tables: projects, files, users schema."
topics: [vector-projector, convex, schema, database]
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
| `pricing_catalog` | Stripe products/prices snapshot |

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
| backerAccessGrantedAt | When backer access was granted |
| backerAccessUntil | When backer access expires |
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

### pricing_catalog

Stripe products/prices snapshot. Singleton pattern.

| Column | Purpose |
|--------|--------|
| key | Always "catalog" |
| products | Array of Stripe products |
| prices | Array of Stripe prices |
| lastSyncedAt | Timestamp of last sync |
| lastSyncError | Error message if sync failed |
| lastSyncFailedAt | Timestamp of last failed sync |

**See:** `/core/06-payments/convex-stripe-component-overview.md`

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
- `by_authUserId` - check for pending uploads per user
- `by_expiresAt` - cleanup expired records

**Lifecycle:**
1. Created when blob uploaded to `/upload` endpoint
2. Deleted when `commitFile` consumes it (one-time use)
3. Expired records cleaned up opportunistically

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
  .index("by_authUserId", ["authUserId"])
  .index("by_expiresAt", ["expiresAt"]),
```

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

## Open Questions

1. What fields go in extrusionSettings besides height?
2. What fields go in svgSettings besides scale/rotation/position?
3. Max number of svgShapes per extrusionPlane? (result of boolean, software-enforced)
4. Do we need sortOrder for extrusionPlanes, or is array order enough?

---

## Implementation Status

| Table | Status |
|-------|--------|
| pending_uploads | Done |
| stl_files | Done (with mutations) |
| svg_files | Done (with mutations) |
| projects | Schema done, mutations not started |
| pricing_catalog | Done |

---

## Related Docs

- `/domains/vectorprojector/discovery-mode.md` - Base samples and anonymous access
- `/domains/vectorprojector/stl-upload.md` - STL validation and upload
- `/domains/vectorprojector/file-storage.md` - Storage infrastructure
- `/core/06-payments/convex-stripe-component-overview.md` - Stripe integration