---
last_updated: 2026-01-23
updated_by: saas-blueprint
change: "Initial file size limits"
---

# File Limits

Enforce limits on upload to control storage costs.

## Limits

| Asset | Max Size | Typical | Per-User Limit |
|-------|----------|---------|----------------|
| STL | 5 MB | 2 MB | 20 files |
| SVG | 20 KB | 10 KB | 50 files |
| Thumbnail | auto | 10 KB | 1 per STL |

## Validation

```tsx
const MAX_STL_SIZE = 5 * 1024 * 1024  // 5 MB
const MAX_SVG_SIZE = 20 * 1024        // 20 KB

function validateFile(file: File, type: 'stl' | 'svg'): boolean {
  const maxSize = type === 'stl' ? MAX_STL_SIZE : MAX_SVG_SIZE
  if (file.size > maxSize) {
    toast.error(`File too large. Max ${type.toUpperCase()} size is ${maxSize / 1024}KB`)
    return false
  }
  return true
}
```

## Thumbnails

Auto-generate WebP thumbnails from STLs on upload. Keep them small (~10 KB).

TODO: Add thumbnail generation pattern (client-side vs server-side TBD)
