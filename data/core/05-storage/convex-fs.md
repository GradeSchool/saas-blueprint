---
last_updated: 2026-01-31
updated_by: vector-projector
change: "Added Better Auth workaround reference, marked Vector Projector setup complete"
status: tested
tldr: "File storage with Convex-FS backed by bunny.net CDN. Alpha status."
topics: [storage, convex, bunny, cdn, files]
---

# Convex-FS Overview

File storage component for Convex apps, powered by bunny.net.

---

## What Is It?

Convex-FS is a Convex component that provides filesystem-like operations backed by bunny.net's global CDN and edge storage. Written by Jamie Turner (Convex co-founder).

**Status:** Alpha. APIs may change before 1.0.

**Resources:**
- Docs: https://convexfs.dev/
- Repo: https://github.com/jamwt/convex-fs
- Package: `convex-fs` on npm

---

## Why Use It?

| Feature | Benefit |
|---------|--------|
| Path-based organization | Familiar filesystem mental model |
| Global CDN delivery | Fast downloads worldwide via bunny.net edge |
| Signed URLs | Secure, time-limited access tied to app auth |
| Deduplication | Identical files stored once (reference counted) |
| Soft delete | Configurable recovery window before permanent deletion |
| File expiration | Auto-cleanup for temporary content |
| Atomic transactions | No race conditions on move/copy/delete |

---

## How It Works

1. App uploads file to Convex via convex-fs
2. Convex-fs stores blob in bunny.net edge storage
3. File is referenced by path (e.g., `/users/123/models/cube.stl`)
4. When file is requested, convex-fs generates signed URL
5. User downloads directly from bunny.net CDN (global edge)

Blobs are reference-counted. Multiple paths can point to same blob. When last reference is deleted, blob is cleaned up.

---

## Critical: Better Auth Cross-Domain

**If using Better Auth with cross-domain plugin, the standard convex-fs upload flow does NOT work.**

**See:** `better-auth-upload-workaround.md` in this directory.

**Summary of the problem:**
1. Better Auth cross-domain stores auth in localStorage, not cookies
2. convex-fs hardcodes `Access-Control-Allow-Origin: *` (incompatible with credentials)
3. `ctx.auth.getUserIdentity()` returns null with Better Auth

**Solution:** Custom `/upload` endpoint using `corsRouter` from `convex-helpers`. The workaround doc has full implementation.

---

## Multi-App Strategy

**One bunny.net account, separate storage zone per app.**

| App | Storage Zone | Pull Zone |
|-----|--------------|----------|
| Vector Projector | `vector-projector` | `vector-projector-cdn` |
| Tiler Styler | `tiler-styler` | `tiler-styler-cdn` |
| Future apps | `{app-name}` | `{app-name}-cdn` |

**Why zone per app (not shared zone with path namespacing):**

| Concern | Zone per app | Shared zone |
|---------|--------------|-------------|
| Storage costs | Visible per zone in bunny dashboard | Must calculate from paths |
| Isolation | Complete, separate API keys | Shared credentials |
| Delete an app | Delete the zone | Delete by path prefix |
| Setup effort | One-time per app | Slightly less |

**Path namespacing still applies within each zone:**

```
/users/{userId}/stl/{fileId}.stl
/users/{userId}/svg/{fileId}.svg
/base/stl/{fileId}.stl
/base/svg/{fileId}.svg
```

---

## Per-App Usage Tracking

### Storage

With zone-per-app, bunny.net dashboard shows storage per zone automatically. No custom tracking needed.

For finer granularity (per-user), query convex-fs metadata in Convex.

### Bandwidth

Bunny.net dashboard shows bandwidth per zone automatically.

For finer granularity (per-user), would need to process raw logs from Logging API. Not implementing now.

---

## Bunny.net Setup Guide

Based on: https://convexfs.dev/get-started/setup-bunny/

### Step 1: Create Account

Register at bunny.net (free to start).

**weheart.art account:** `weheartdotart@gmail.com`

### Step 2: Create Storage Zone

1. Navigate to **Storage** in dashboard
2. Click **+ Add Storage Zone**
3. Configure:
   - Name: `{app-name}` (e.g., `vector-projector`)
   - Tier: Standard or Edge (SSD)
   - Main region: Choose closest to users
   - Add replication regions as needed
4. Create the zone

**Tier notes:**
- Edge (SSD): Faster, requires Frankfurt (DE) as main region
- Standard: More region flexibility, slightly slower

### Step 3: Create Pull Zone (CDN)

1. In your storage zone, click **Connected pull zones**
2. Click **+ Connect Pull Zone**
3. Configure:
   - Name: `{app-name}-cdn` (e.g., `vector-projector-cdn`)
   - Origin type: Storage Zone (auto-selected)
   - Tier: Standard
   - Pricing zones: Default (all)
4. Create the zone

### Step 4: Security

1. On pull zone **Hostnames** tab, enable **Force SSL**
2. Navigate to **Security → Token authentication**
3. Enable token authentication

### Step 5: Gather Environment Variables

| Variable | Where to find |
|----------|---------------|
| `BUNNY_STORAGE_ZONE` | Storage zone name |
| `BUNNY_CDN_HOSTNAME` | Pull zone Hostnames tab (full URL) |
| `BUNNY_TOKEN_KEY` | Pull zone Security → Token authentication |
| `BUNNY_API_KEY` | Storage zone FTP & API access → Password (not read-only) |
| `BUNNY_REGION` | Only if NOT using Frankfurt (see codes below) |

**Region codes:**
- `de` - Frankfurt, Germany (default)
- `ny` - New York
- `sg` - Singapore

---

## Vector Projector Setup (Complete)

**Storage Zone:**
- Name: `vector-projector`
- Tier: Standard
- Main region: New York (NY)
- Replication: Los Angeles (LA)

**Pull Zone:**
- Name: `vector-projector-cdn`
- Tier: Standard
- Force SSL: Enabled
- Bunny Shield: Basic (Free)
- Rate limiting: 100 req/10s per IP
- Hotlink protection: vectorprojector.weheart.art, localhost

**Environment Variables (Convex Dashboard):**
```
BUNNY_STORAGE_ZONE=vector-projector
BUNNY_CDN_HOSTNAME=https://vector-projector-cdn.b-cdn.net
BUNNY_TOKEN_KEY=(from token auth screen)
BUNNY_API_KEY=(from FTP & API access)
BUNNY_REGION=ny
```

**Implementation Status:**
- [x] Bunny.net zone created
- [x] Env vars configured
- [x] convex-fs component registered
- [x] Custom /upload endpoint (Better Auth workaround)
- [x] Download routes with auth
- [x] Pending uploads tracking (security)
- [x] STL file upload/commit/delete
- [x] Admin panel for base samples
- [x] User discovery mode UI

---

## Related Docs in This Directory

| Doc | Purpose |
|-----|--------|
| `bunny-setup.md` | Detailed bunny.net configuration steps |
| `convex-fs-docs.md` | Reference to all convex-fs documentation pages |
| `better-auth-upload-workaround.md` | CRITICAL - how to make uploads work with Better Auth |

---

## New App Checklist

1. Create storage zone in bunny.net (`{app-name}`)
2. Create pull zone (`{app-name}-cdn`)
3. Enable Force SSL, Bunny Shield, rate limiting, hotlink protection
4. Add env vars to Convex dashboard
5. Install convex-fs and convex-helpers
6. Check if using Better Auth cross-domain:
   - **Yes:** Follow `better-auth-upload-workaround.md`
   - **No:** Use standard convex-fs registerRoutes for uploads
7. Configure downloadAuth callback
8. Define path conventions
9. Create file tables (stl_files, svg_files, etc.)
10. Create pending_uploads table (for security)
