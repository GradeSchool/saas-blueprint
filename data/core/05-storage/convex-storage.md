---
last_updated: 2026-01-23
updated_by: saas-blueprint
change: "Initial Convex storage patterns"
---

# Convex Storage

File storage with Convex (not external CDN).

## Decision

Use Convex Storage, not Bunny or other CDN.

**Rationale**:
- Convex Pro includes 100 GB storage, 50 GB bandwidth
- One service to manage
- Native integration

## Upload Pattern

```typescript
// Client
const generateUploadUrl = useMutation(api.files.generateUploadUrl)

async function uploadFile(file: File) {
  const url = await generateUploadUrl()
  const result = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": file.type },
    body: file,
  })
  const { storageId } = await result.json()
  return storageId
}
```

```typescript
// convex/files.ts
export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl()
  },
})
```

## Download Pattern

- STLs: Load one-at-a-time when user needs them
- Thumbnails/SVGs: Small enough to load eagerly
- Browser caching helps on repeat visits

## Cost Estimate (3K users)

- Storage: ~79 GB (under 100 GB included) → $0
- Bandwidth: ~37 GB (under 50 GB included) → $0
- Total: **$25/mo** (just Pro base)
