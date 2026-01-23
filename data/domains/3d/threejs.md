---
last_updated: 2026-01-23
updated_by: saas-blueprint
change: "Initial 3D patterns"
---

# 3D

Patterns for 3D graphics apps.

## Libraries

| Library | Use Case |
|---------|----------|
| Three.js | 3D rendering, scene management |
| @react-three/fiber | React bindings for Three.js |
| @react-three/drei | Helpers and abstractions |

## STL Handling

TODO: STL loading and parsing

## Mesh Operations

TODO: Common mesh operations

## Thumbnail Generation

TODO: Generating preview images from 3D models

## Notes

- Keep models under 5 MB
- Generate WebP thumbnails (~10 KB)
- Load models one-at-a-time, not in batches
