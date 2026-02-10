---
last_updated: 2026-02-09
updated_by: saas-blueprint
change: "Fixed structure to show platform first, updated domains to reflect reality"
tldr: "Root index for SaaS Blueprint. Start here to navigate the knowledge repository."
topics: [index, navigation, overview]
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

## Quick Discovery API

Find answers fast without filling context or endless searching.

| Endpoint | Purpose |
|----------|---------|
| `GET /api/metadata` | All file metadata in one call (no bodies) |
| `GET /api/search?q=webhook` | Full-text search with snippets |
| `GET /api/topics` | List all unique topics |
| `GET /api/topics/auth` | Files tagged with a topic |

---

## Full API

### Read

```
GET /api/index                    This file
GET /api/metadata                 All frontmatter (no bodies)
GET /api/search?q={term}          Full-text search with snippets
GET /api/topics                   List all unique topics
GET /api/topics/{topic}           Files tagged with a topic
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
/platform             Read first - shared infrastructure
  overview.md         What we build, philosophy
  infrastructure.md   Shared services, Stripe org, costs

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

/domains              App-specific patterns (deltas from core)
  /vectorprojector    Vector Projector app specifics
```

---

## Philosophy

Maximum simplicity for solo dev. No auto-save, no undo, no mobile, no collaboration.

---

## Stack

Vite + React 19 + React Compiler + TypeScript + Convex + shadcn + Stripe