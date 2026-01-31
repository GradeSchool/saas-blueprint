---
last_updated: 2026-01-31
updated_by: vector-projector
change: "Initial creation - STL upload validation flow"
status: planned
---

# STL Upload

Client-side validation and upload flow for STL files.

**Status:** Planned. Upload infrastructure exists, validation not yet implemented.

---

## Intent

Validate STL files **in the browser** before allowing upload. This ensures:

1. Only valid STL files are uploaded (not renamed junk)
2. Users get immediate feedback on invalid files
3. Metadata is extracted from actual file parsing (not trusted from client)
4. Thumbnails are generated client-side and stored alongside the STL

---

## Validation Flow

```
User selects file
       ↓
Read file as ArrayBuffer
       ↓
Parse with three.js STLLoader
       ↓
   ┌───┴───┐
   │       │
Fails    Succeeds
   │       │
   ↓       ↓
Show    Extract metadata:
error   - Triangle count
        - Bounding box
        - File size (actual)
        - Dimensions (x, y, z)
              ↓
        Generate thumbnail
        (render to canvas, export PNG)
              ↓
        Show preview to user
        with metadata report
              ↓
        User confirms upload
              ↓
        Upload STL file → get blobId
              ↓
        Upload thumbnail PNG → get thumbnailBlobId
              ↓
        Commit both with validated metadata
```

---

## Validation Library

**three.js STLLoader**

Already in use for 3D rendering. Use same loader for validation.

```typescript
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader'
import * as THREE from 'three'

const loader = new STLLoader()

async function validateStl(file: File): Promise<StlValidationResult> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    
    reader.onload = () => {
      try {
        const geometry = loader.parse(reader.result as ArrayBuffer)
        
        // Extract metadata from parsed geometry
        const positionAttr = geometry.attributes.position
        const triangleCount = positionAttr.count / 3
        
        geometry.computeBoundingBox()
        const box = geometry.boundingBox!
        const dimensions = {
          x: box.max.x - box.min.x,
          y: box.max.y - box.min.y,
          z: box.max.z - box.min.z,
        }
        
        resolve({
          valid: true,
          triangleCount,
          dimensions,
          fileSize: file.size,
          geometry, // Keep for thumbnail generation
        })
      } catch (e) {
        resolve({
          valid: false,
          error: 'Not a valid STL file',
        })
      }
    }
    
    reader.onerror = () => {
      resolve({ valid: false, error: 'Could not read file' })
    }
    
    reader.readAsArrayBuffer(file)
  })
}
```

---

## Metadata Report

After validation, show user a report:

| Field | Source | Example |
|-------|--------|--------|
| File name | Original file | `bracket.stl` |
| File size | Actual bytes | `2.4 MB` |
| Triangles | Parsed geometry | `12,847` |
| Dimensions | Bounding box | `45 × 30 × 12 mm` |
| Format | Detection | `Binary STL` |

**Note:** Dimensions shown in mm assume STL is in mm (common for 3D printing). Could add unit selector if needed.

---

## Thumbnail Generation

Render the parsed geometry to a canvas and export as PNG.

```typescript
import * as THREE from 'three'

function generateThumbnail(
  geometry: THREE.BufferGeometry,
  width = 256,
  height = 256
): Promise<Blob> {
  return new Promise((resolve) => {
    // Create scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf0f0f0)
    
    // Create mesh with basic material
    const material = new THREE.MeshStandardMaterial({
      color: 0x606060,
      flatShading: true,
    })
    const mesh = new THREE.Mesh(geometry, material)
    
    // Center geometry
    geometry.computeBoundingBox()
    const box = geometry.boundingBox!
    const center = box.getCenter(new THREE.Vector3())
    mesh.position.sub(center)
    scene.add(mesh)
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0x404040)
    scene.add(ambientLight)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(1, 1, 1)
    scene.add(directionalLight)
    
    // Camera positioned to see whole model
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    const size = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)
    const distance = maxDim * 2
    camera.position.set(distance, distance * 0.5, distance)
    camera.lookAt(0, 0, 0)
    
    // Render to offscreen canvas
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    renderer.render(scene, camera)
    
    // Export as PNG blob
    renderer.domElement.toBlob((blob) => {
      renderer.dispose()
      resolve(blob!)
    }, 'image/png')
  })
}
```

---

## Upload Flow (With Validation)

```typescript
async function handleStlUpload(file: File) {
  // Step 1: Validate
  setStatus('Validating...')
  const validation = await validateStl(file)
  
  if (!validation.valid) {
    setError(validation.error)
    return
  }
  
  // Step 2: Generate thumbnail
  setStatus('Generating preview...')
  const thumbnailBlob = await generateThumbnail(validation.geometry!)
  
  // Step 3: Show preview, wait for user confirmation
  setPreview({ validation, thumbnailBlob })
  // User clicks "Upload" button...
}

async function confirmUpload() {
  const { validation, thumbnailBlob } = preview
  
  // Step 4: Upload STL
  setStatus('Uploading STL...')
  const stlBlobId = await uploadFile(file)
  
  // Step 5: Upload thumbnail
  setStatus('Uploading thumbnail...')
  const thumbnailBlobId = await uploadFile(thumbnailBlob)
  
  // Step 6: Commit with validated metadata
  setStatus('Saving...')
  await commitStlFile({
    blobId: stlBlobId,
    thumbnailBlobId,
    fileName: file.name,
    name: displayName,
    fileSize: validation.fileSize,      // From actual file
    triangleCount: validation.triangleCount, // From parse
    dimensions: validation.dimensions,   // From parse
    isBase: false,
  })
  
  setStatus('Done!')
}
```

---

## Schema Changes (Future)

`stl_files` table will need additional fields:

```typescript
stl_files: defineTable({
  userId: v.id("users"),
  path: v.string(),
  fileName: v.string(),
  name: v.string(),
  fileSize: v.number(),
  isBase: v.boolean(),
  createdAt: v.number(),
  // New fields from validation:
  thumbnailPath: v.optional(v.string()),
  triangleCount: v.optional(v.number()),
  dimensionX: v.optional(v.number()),
  dimensionY: v.optional(v.number()),
  dimensionZ: v.optional(v.number()),
})
```

---

## Thumbnail Storage

Thumbnails stored alongside STL files:

```
/users/{subject}/stl/{uuid}.stl
/users/{subject}/stl/{uuid}_thumb.png

/base/stl/{uuid}.stl
/base/stl/{uuid}_thumb.png
```

---

## Error States

| Error | User Message | Cause |
|-------|-------------|-------|
| Parse failure | "This doesn't appear to be a valid STL file" | Corrupted, wrong format, renamed file |
| Empty geometry | "This STL file contains no geometry" | Valid header but no triangles |
| File too large | "File exceeds 50 MB limit" | Before validation even starts |
| Read error | "Could not read file" | Permission issue, file locked |

---

## UI Components (Future)

### StlValidator Hook

```typescript
function useStlValidator() {
  const [status, setStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle')
  const [result, setResult] = useState<StlValidationResult | null>(null)
  const [thumbnail, setThumbnail] = useState<Blob | null>(null)
  
  const validate = async (file: File) => {
    setStatus('validating')
    const result = await validateStl(file)
    setResult(result)
    
    if (result.valid) {
      const thumb = await generateThumbnail(result.geometry!)
      setThumbnail(thumb)
      setStatus('valid')
    } else {
      setStatus('invalid')
    }
  }
  
  const reset = () => {
    setStatus('idle')
    setResult(null)
    setThumbnail(null)
  }
  
  return { status, result, thumbnail, validate, reset }
}
```

### StlUploadPreview Component

Shows validation results before upload:

```
┌─────────────────────────────────────┐
│  [Thumbnail]    bracket.stl         │
│                                     │
│                 File size: 2.4 MB   │
│                 Triangles: 12,847   │
│                 Dimensions:         │
│                 45 × 30 × 12 mm     │
│                                     │
│  Display name: [_______________]    │
│                                     │
│  [Cancel]              [Upload]     │
└─────────────────────────────────────┘
```

---

## SVG Validation (Similar Pattern)

SVG files follow same pattern but use svgo for validation/sanitization:

```typescript
import { optimize } from 'svgo/browser'

async function validateSvg(file: File): Promise<SvgValidationResult> {
  const text = await file.text()
  
  try {
    const result = optimize(text, {
      plugins: [
        'removeScriptElement',      // Security: remove scripts
        'removeXlink',              // Security: remove external refs
        // ... other optimization plugins
      ]
    })
    
    return {
      valid: true,
      sanitizedSvg: result.data,
      fileSize: new Blob([result.data]).size,
    }
  } catch (e) {
    return {
      valid: false,
      error: 'Not a valid SVG file',
    }
  }
}
```

**Important:** For SVG, upload the **sanitized** version, not the original. This removes potential XSS vectors.

---

## Implementation Priority

1. **StlValidator hook** - Core validation logic
2. **Thumbnail generation** - Visual preview
3. **StlUploadPreview component** - UI for validation results
4. **Schema migration** - Add new fields
5. **commitFile update** - Accept validated metadata + thumbnail
6. **SVG validation** - Same pattern with svgo

---

## Related Docs

- `/domains/vectorprojector/file-storage.md` - Storage infrastructure
- `/core/05-storage/convex-fs.md` - File storage backend
- [three.js STLLoader docs](https://threejs.org/docs/#examples/en/loaders/STLLoader)
- [svgo browser usage](https://svgo.dev/docs/usage/browser/)