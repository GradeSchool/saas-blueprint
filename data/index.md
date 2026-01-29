---
last_updated: 2026-01-29
updated_by: vector-projector
change: "Added quickstart manifest as primary agent entry point"
---

# SaaS Blueprint

A living knowledge repository for building SaaS apps. Apps are built by a solo dev and AI agents.

---

## AI Agents: Start Here

| Goal | Start With |
|------|------------|
| **Spin up a new app** | [quickstart-manifest.md](core/00-overview/quickstart-manifest.md) |
| **Understand workflow rules** | [agent-workflow.md](core/00-overview/agent-workflow.md) |
| **Validate setup progress** | [checkpoints.md](core/00-overview/checkpoints.md) |
| **Debug something broken** | [hardening-patterns.md](core/00-overview/hardening-patterns.md) |

---

## API

### Read

```
GET /api/index                    This file
GET /api/files                    List all files
GET /api/files/{path}             Get file content
GET /api/changes?since=YYYY-MM-DD List updated files
GET /api/apps                     List registered apps
```

### Write

```
POST /api/files/{path}
Body: { "content": "...", "source": "app-name" }

POST /api/apps/{name}/checked
Body: {}
```

---

## Frontmatter Format

```yaml
---
last_updated: 2026-01-29
updated_by: your-app-name
change: "Brief description"
status: tested
context_cost: 2KB
type: setup | reference
requires: [file.md]
unlocks: [file.md]
---
```

| Field | Purpose |
|-------|--------|
| `context_cost` | Estimated reading size for context planning |
| `type` | `setup` (read during build) or `reference` (read when debugging) |
| `requires` | Files that must be read first |
| `unlocks` | Files that can be read after this |

---

## Structure

```
/core                 Sequential setup (00-08)
  /00-overview        Agent workflow, quickstart, checkpoints, hardening
  /01-setup           Stack scaffolding
  /02-frontend        React, UI, sessions
  /03-convex          Backend, schema, queries
  /04-auth            Better Auth setup + debug
  /05-storage         File handling
  /06-payments        Stripe
  /07-analytics       PostHog
  /08-hosting         Deployment

/domains              App-specific patterns
  /3d                 Three.js, STL, meshes
  /2d                 Canvas, SVG
```

---

## Philosophy

Maximum simplicity for solo dev. No auto-save, no undo, no mobile, no collaboration.

---

## Stack

Vite + React 19 + React Compiler + TypeScript + Convex + shadcn + Stripe