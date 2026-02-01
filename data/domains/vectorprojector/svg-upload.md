---
last_updated: 2026-02-01
updated_by: vector-projector
change: "Initial creation"
status: planned
---

# SVG Upload

Client-side validation and upload flow for SVG files.

**Status:** Planned. Upload infrastructure exists, validation not yet implemented.

---

## Constraints

| Constraint | Value | Notes |
|------------|-------|-------|
| **Max file size** | **15 KB** | Enforced client-side before upload |
| Max per user | 250 files | Not counting base samples |
| Validation | TBD | Options: svgo, custom parser, or DOMParser |

---

## Intent

Validate and sanitize SVG files **in the browser** before allowing upload. This ensures:

1. Only valid SVG files are uploaded (not renamed junk)
2. Malicious content is stripped (scripts, external references)
3. Users get immediate feedback on invalid files
4. File is safe to render in the browser

---

## Security Concerns

SVG files can contain malicious content:

| Threat | Example | Mitigation |
|--------|---------|------------|
| Embedded scripts | `<script>alert('xss')</script>` | Strip all script elements |
| Event handlers | `<svg onload="...">` | Strip all `on*` attributes |
| External references | `<image href="https://evil.com/track.png">` | Strip external URLs |
| XML entities | `<!ENTITY xxe SYSTEM "file:///etc/passwd">` | Disable entity expansion |
| Embedded data URIs | `<image href="data:text/html,...">` | Allowlist safe data URI types |

---

## Validation Flow

```
User selects file
       ↓
Check file size (reject if > 15 KB)
       ↓
Read file as text
       ↓
Parse and sanitize SVG
       ↓
   ┌───┴───┐
   │       │
Fails    Succeeds
   │       │
   ↓       ↓
Show    Extract metadata:
error   - Dimensions (viewBox or width/height)
        - Element count
        - File size (actual)
              ↓
        Show preview to user
        (render sanitized SVG)
              ↓
        User confirms upload
              ↓
        Upload sanitized SVG → get blobId
              ↓
        Commit with metadata
```

---

## Validation Options

Still evaluating approaches:

### Option 1: svgo

[svgo](https://svgo.dev/) - Popular SVG optimizer with browser support.

**Pros:**
- Well-maintained, widely used
- Configurable plugins for sanitization
- Optimizes file size

**Cons:**
- Additional dependency (~50 KB gzipped)
- May be overkill if we only need sanitization

### Option 2: DOMPurify + DOMParser

Use browser's DOMParser with DOMPurify for sanitization.

**Pros:**
- DOMPurify is small and focused on security
- No SVG-specific dependency

**Cons:**
- Doesn't optimize/normalize SVG
- May need additional validation logic

### Option 3: Custom Parser

Roll our own minimal SVG validator.

**Pros:**
- No dependencies
- Full control over what's allowed

**Cons:**
- More code to maintain
- Risk of missing edge cases

---

## Minimum Sanitization Requirements

Regardless of approach, must strip:

1. `<script>` elements
2. `on*` event handler attributes
3. `javascript:` URLs
4. External resource references (non-data URIs)
5. `<foreignObject>` elements (can embed HTML)
6. XML processing instructions
7. DOCTYPE declarations with entities

---

## Metadata Extraction

After validation, extract:

| Field | Source | Example |
|-------|--------|--------|
| File name | Original file | `logo.svg` |
| File size | Actual bytes | `8.2 KB` |
| Dimensions | viewBox or width/height | `100 × 100` |
| Element count | DOM traversal | `47 elements` |

---

## Error States

| Error | User Message | Cause |
|-------|-------------|-------|
| File too large | "File exceeds 15 KB limit" | Check before reading file |
| Parse failure | "This doesn't appear to be a valid SVG file" | Invalid XML, missing svg root |
| Contains scripts | "SVG contains scripts which are not allowed" | Security: embedded JavaScript |
| External references | "SVG contains external references which are not allowed" | Security: external URLs |
| Empty SVG | "This SVG file contains no graphics" | Valid SVG but no visual content |
| Read error | "Could not read file" | Permission issue, file locked |

---

## Schema

`svg_files` table (already defined):

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

**Future fields** (after validation implemented):

```typescript
// Additional metadata from validation:
viewBoxWidth: v.optional(v.number()),
viewBoxHeight: v.optional(v.number()),
elementCount: v.optional(v.number()),
```

---

## Storage

SVG files stored at:

```
/users/{subject}/svg/{uuid}.svg
/base/svg/{uuid}.svg
```

---

## Implementation Priority

1. **Decide on validation approach** - svgo vs DOMPurify vs custom
2. **Implement sanitization** - Strip dangerous content
3. **Add metadata extraction** - Dimensions, element count
4. **Update upload flow** - Validate before upload
5. **Add preview** - Show sanitized SVG to user

---

## Related Docs

- `/domains/vectorprojector/file-storage.md` - Storage infrastructure
- `/domains/vectorprojector/discovery-mode.md` - Base samples for anonymous users
- `/domains/vectorprojector/stl-upload.md` - STL upload (similar pattern)
- [svgo docs](https://svgo.dev/docs/usage/browser/)
- [DOMPurify](https://github.com/cure53/DOMPurify)