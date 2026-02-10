---
last_updated: 2026-01-23
updated_by: saas-blueprint
change: "Initial architecture decisions"
tldr: "Core architectural decisions for desktop-first graphics/3D SaaS apps optimized for solo devs."
topics: [architecture, overview, decisions]
---

# Architecture

Core architectural decisions for graphics/3D SaaS apps. These choices optimize for solo dev velocity and focused user experience over maximum reach.

## Target Apps

- Desktop-first graphics tools
- 3D printing / CAD-adjacent
- Single-user projects (no real-time collaboration)
- Per-user storage: ~45 MB typical, ~100 MB max

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Mobile | No (1024x768 min) | Precision work needs desktop |
| Collaboration | No | Removes CRDT/sync complexity |
| State | React state, explicit save | Simple, users learn to save |
| Auto-save | No | Interrupts flow |
| Undo | No | Adjust settings back manually |
| Backend | Convex Pro | Good DX, includes storage |
| File storage | Convex (not CDN) | One service, simpler |
| Payments | Stripe direct | Lower fees, no MOR risk |
| Auth | better-auth | Open source, self-hosted |

## Stack Diagram

```
┌─────────────────────────────────────────────────┐
│  UI Layer (React + shadcn)                      │
├─────────────────────────────────────────────────┤
│  State Layer (React useState/useReducer)        │
│  - All working state in memory                  │
│  - No persistence until explicit save           │
│  - No undo/redo stack                           │
├─────────────────────────────────────────────────┤
│  Backend (Convex Pro)                           │
│  - Projects saved on user action                │
│  - File storage (STL, SVG, thumbnails)          │
│  - Auth (better-auth)                           │
├─────────────────────────────────────────────────┤
│  Payments (Stripe)                              │
└─────────────────────────────────────────────────┘
```
