---
last_updated: 2026-02-01
updated_by: vector-projector
change: "Removed duplicate file size limits - reference upload docs instead"
status: tested
---

# Discovery Mode

Anonymous exploration of the app before signing up.

---

## What Anonymous Users Can Do

- See sample STL models (base content)
- See sample SVG files (base content)
- Load samples into the viewer
- Manipulate, position, extrude - full tool access
- Experience the core workflow

## What Anonymous Users Cannot Do

- Upload their own files
- Save projects
- Load projects

## Sign Up Prompt

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

### File Limits

See the upload docs for current file size limits:
- [stl-upload.md](/domains/vectorprojector/stl-upload.md) - STL max size
- [svg-upload.md](/domains/vectorprojector/svg-upload.md) - SVG max size

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

## Admin Panel: Base Content Management

Admins need UI to:
- Upload sample STL files
- Upload sample SVG files
- View/delete existing samples
- See which admin uploaded each sample

**Implementation:**
- STL: `src/components/admin/sections/BaseStlSection.tsx`
- SVG: `src/components/admin/sections/BaseSvgSection.tsx`

---

## Open Questions

1. How many base samples should we start with? (Minimum viable for discovery)
2. Should base samples have categories/tags?

---

## Related Docs

- `/domains/vectorprojector/stl-upload.md` - STL validation and upload
- `/domains/vectorprojector/svg-upload.md` - SVG validation and upload
- `/domains/vectorprojector/file-storage.md` - Storage infrastructure
- `/core/05-storage/convex-fs.md` - File storage backend