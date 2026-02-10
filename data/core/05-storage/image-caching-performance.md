---
last_updated: 2026-02-10
updated_by: vector-projector
change: "Fix 1 blocked - Bunny token auth rejects unsigned URLs"
status: documented
tldr: "Signed URLs break browser caching. Unsigned URLs blocked by token auth. Need alternative fix."
topics: [storage, caching, performance, images, thumbnails]
---

# Image Caching Performance Issues

This doc explains a caching problem with how we serve images (thumbnails, etc.) and what we need to fix before scaling.

---

## The Problem in Plain English

Every time you view a thumbnail, the app asks Bunny CDN for a "secret password link" that expires in a few minutes. The link looks something like:

```
image.jpg?password=ABC123&expires=tomorrow
```

When you navigate away and come back, the app asks for a NEW password link:

```
image.jpg?password=XYZ789&expires=tomorrow
```

Your browser looks at this and thinks: "I've never seen this exact link before." So it downloads the image again.

**Same picture. Different password. Fresh download every time.**

---

## Why Do We Have Password Links?

For private user files, we don't want strangers guessing URLs and accessing someone else's uploads. The password (called a "signed URL" or "token") proves they're authorized to see that file.

This is good security for private content.

---

## The Mismatch

**Base sample thumbnails are public.** Everyone can see them. There's no secret. We're putting a lock on an open door.

But we're still generating password links for them, which breaks browser caching.

---

## How Users Experience This

- Thumbnails flicker or show loading states when navigating
- The same images download over and over
- Pages feel slower than they should
- On slow connections, it's very noticeable

---

## What Happens at Scale

With 10 thumbnails, this is annoying.

With 100 thumbnails, pages feel sluggish.

With 1000 thumbnails:
- Bandwidth costs increase (same images downloaded repeatedly)
- CDN bills go up
- Users on mobile or slow connections have a bad experience
- Server load increases from generating thousands of signed URLs

---

## Content Types and Their Needs

| Content | Private? | Needs Signing? | Caching Priority |
|---------|----------|----------------|------------------|
| Base sample STLs | No | No | Medium |
| Base sample thumbnails | No | No | **High** |
| User STLs | Yes | Yes | Low |
| User thumbnails | Yes | Yes | Medium |

Public content should use stable URLs that browsers can cache.

Private content needs signed URLs, but we should cache the signed URL on the client side rather than generating a new one every request.

---

## Fix 1: Skip Signing for Public Content ❌ BLOCKED

**Why it doesn't work:** Bunny CDN has Token Authentication enabled (for security). This rejects ALL requests without a valid token, including unsigned URLs.

**Options to enable this:**
1. Create a separate pull zone without token auth for public content only
2. Disable token auth entirely (not recommended - makes private content guessable)

For now, this fix is blocked. All content must use signed URLs.

---

## Fix 2: Client-Side URL Caching (Recommended Next)

For all content, cache the generated signed URL in React state or context. Reuse it until it's close to expiring, then generate a new one.

**Implementation approach:**
```typescript
// In a context or hook
const urlCache = useRef<Map<string, { url: string; expiresAt: number }>>(new Map());

function getCachedUrl(path: string): string | null {
  const cached = urlCache.current.get(path);
  if (cached && cached.expiresAt > Date.now() + 30000) { // 30s buffer
    return cached.url;
  }
  return null;
}
```

**Tradeoff:** Adds complexity. Need to track expiration times. But this is the only viable fix with token auth enabled.

---

## Fix 3: Longer-Lived Signed URLs

Instead of 5-minute expiry (current default in `convex/fs.ts`), use 24-hour expiry for thumbnails.

```typescript
// In fs.ts
export const fs = new ConvexFS(components.fs, {
  // ...
  downloadUrlTtl: 86400, // 24 hours instead of 300 (5 min)
});
```

**Tradeoff:** Slightly weaker security window, but thumbnails aren't sensitive. Combined with client-side caching, this means URLs only regenerate once per day.

---

## Fix 4: Separate Public Pull Zone

Create a second Bunny pull zone WITHOUT token authentication, specifically for public base content.

**Setup:**
1. Create new pull zone: `{app}-public-cdn`
2. Don't enable token auth
3. Add `BUNNY_PUBLIC_CDN_HOSTNAME` env var
4. Route `/base/*` content through public CDN

**Tradeoff:** More infrastructure to manage. Two CDN configurations.

---

## Current Status

- ❌ **Fix 1 blocked** — Token auth rejects unsigned URLs
- ⏳ **Fix 2 (client caching)** — Best next step
- ⏳ **Fix 3 (longer expiry)** — Easy quick win, do alongside Fix 2
- ⏳ **Fix 4 (separate CDN)** — Only if needed at scale

---

## Recommended Action

1. **Quick win:** Increase `downloadUrlTtl` in `convex/fs.ts` from 300 to 86400 (5 min → 24 hours)
2. **Then:** Implement client-side URL caching hook
3. **If needed:** Set up separate public pull zone

---

## Related Docs

- `/core/05-storage/bunny-setup.md` — Bunny CDN configuration
- `/core/05-storage/convex-fs-docs.md` — convex-fs reference
- `/domains/vectorprojector/stl-upload.md` — STL upload flow