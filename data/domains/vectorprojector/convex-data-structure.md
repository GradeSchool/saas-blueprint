---
last_updated: 2026-01-30
updated_by: vector-projector
change: "Fixed table formatting, added CDN security notes"
status: draft
---

# Convex Data Structure

Initial thinking on tables and fields for Vector Projector.

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
| Path | `/base/stl/{fileId}.stl` or `/base/svg/{fileId}.svg` |
| Visibility | Everyone, including anonymous |
| UI placement | Separate "Samples" section, not mixed with user library |
| Limits | Base files don't count against user quotas |

### Server-Side Admin Validation

**Critical:** Never trust `isBase` flag from client. Always validate server-side.

```
commitFile mutation:
  1. Get user's email from auth
  2. If client sends isBase: true:
     a. Query admins table for user's email
     b. If NOT in admins table → reject OR treat as regular user upload
     c. If in admins table → allow /base/ path, set isBase: true
  3. If isBase: false → normal user upload flow
```

**Why:** A malicious client could send `isBase: true` to bypass quota limits or upload inappropriate content as "official" samples.

### Authorization

```
downloadAuth:
  if path.startsWith('/base/') → allow (public)
  if path.startsWith(`/users/${identity.subject}/`) → allow (owner)
  else → deny
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

| Column | Purpose |
|--------|--------|
| userId | Pointer to owner (user or admin) |
| path | Convex-fs path |
| fileName | Raw filename for reference |
| name | User-defined display name |
| fileSize | Bytes, for quota tracking |
| isBase | Boolean, true for admin samples |
| createdAt | Timestamp |

**Path convention:**
- User files: `/users/{identity.subject}/stl/{fileId}.stl`
- Base files: `/base/stl/{fileId}.stl`

**Limit:** 100 per user (base files don't count).

---

## svg_files

User's library of vector artwork, plus admin-uploaded base samples.

| Column | Purpose |
|--------|--------|
| userId | Pointer to owner (user or admin) |
| path | Convex-fs path |
| fileName | Raw filename for reference |
| name | User-defined display name |
| fileSize | Bytes, for quota tracking |
| isBase | Boolean, true for admin samples |
| createdAt | Timestamp |

**Path convention:**
- User files: `/users/{identity.subject}/svg/{fileId}.svg`
- Base files: `/base/svg/{fileId}.svg`

**Limit:** 250 per user (base files don't count).

---

## projects

Where the magic happens. Each project combines one STL with extrusion planes.

**Only authenticated users can have projects.**

| Column | Purpose |
|--------|--------|
| userId | Pointer to owner |
| name | Project name |
| createdAt | Timestamp |
| updatedAt | Timestamp |
| stlFileId | Pointer to stl_files entry (can be user file OR base file) |
| stlOrientation | Rotation + zOffset |
| extrusionPlanes | Array of plane entries (max 10) |

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

This is separate from user file management.

---

## Open Questions

1. What fields go in extrusionSettings besides height?
2. What fields go in svgSettings besides scale/rotation/position?
3. Max number of svgShapes per extrusionPlane? (result of boolean, software-enforced)
4. Do we need sortOrder for extrusionPlanes, or is array order enough?
5. How many base samples should we start with? (Minimum viable for discovery)

---

## Next Steps

1. Finalize field structures
2. Add any missing standard fields
3. Write Convex schema
4. Build admin panel for base content upload
5. Configure Bunny Shield for download security
