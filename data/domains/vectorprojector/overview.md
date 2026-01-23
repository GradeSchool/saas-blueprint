---
last_updated: 2026-01-23
updated_by: 3d-saas-sandbox
change: "Corrected workflow based on actual prototype code"
---

# Vector Projector

## What It Is

A desktop web app for projecting vector artwork onto existing 3D models. Load an STL, orient it, select a flat face, position your SVG on that face, and extrude it. Export a print-ready 3MF with the base model and colored SVG shapes.

## Who It's For

Makers who want to add custom artwork, logos, or text to existing 3D models without CAD software. Think: adding a name to a phone case, a logo to a lid, art to a flat surface.

## Core Flow

1. **Import STL** � Load an existing 3D model
2. **Lay on Face** � Orient the model on the print bed (like slicer's "Place on Face")
3. **Select Face** � Pick a top-facing horizontal surface for projection
4. **Position SVG** � Import vector artwork, position/scale/rotate it on the selected face
5. **Extrude** � Extrude SVG shapes upward from the face, with boolean operations
6. **Export** � Download 3MF with base model + colored extruded shapes

## Key Constraints

- Desktop only (1024x768 minimum)
- Single-user projects, no collaboration
- Explicit save, no auto-save
- File limits enforced (5 MB STL, 20 KB SVG)

## Why Horizontal Faces Only

Designed for flat printing (like HueForge). SVG artwork faces upward on the print bed. This minimizes filament changes per layer for multi-color prints. Projecting onto angled faces would create complex layer-by-layer color transitions.

## What Makes It Different

- Focused workflow: STL in, decorated STL out
- No CAD complexity � just position and extrude
- Automatic boolean operations between SVG shapes
- Outputs manifold geometry ready for slicing
- 3MF export preserves colors per shape

## Revenue Model

- Free tier: limited exports per month
- Paid tier: unlimited exports
- Possible: premium features (multi-face projection, advanced booleans)

## Technical Stack

- Three.js / React Three Fiber for 3D preview
- Manifold library for watertight geometry and booleans
- Clipper2 for SVG boolean operations
- 3MF export with embedded colors

## Status

Prototype complete in 3d-saas-sandbox. Full workflow implemented. Needs: auth, storage, payments, polish.

## Related

- [../3d/](../3d/) - Three.js and mesh patterns
- [../2d/](../2d/) - SVG handling patterns
- [/core/05-storage/](/core/05-storage/) - File limits and storage