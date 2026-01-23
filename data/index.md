# SaaS Blueprint

A living knowledge repository for building SaaS apps. Apps are built by a solo dev and AI agents. Apps are focused on 3d printing adjacent tools and helpers. AI agents fetch patterns, apply them to target apps, and **write back** what they learn.

## Why This Exists

Instead of monorepos, npm packages, or git submodules, AI agents mediate all code sharing:

1. Agent reads patterns from here
2. Agent applies patterns to a target app
3. Agent writes back improvements, decisions, and learnings
4. Knowledge compounds across all apps

Each SaaS app lives in its own repo, fully independent. No dependencies—code is copied and adapted, not imported.

## API

### Read

```
GET /api/index                    This file (start here)
GET /api/files                    List all files and directories
GET /api/files/{path}             Get file content or directory listing
GET /api/changes?since=YYYY-MM-DD List files updated since date
GET /api/apps                     List registered apps and sync status
GET /api/apps/{name}              Get specific app status
```

### Write

```
POST /api/files/{path}
Body: { "content": "...", "source": "app-name" }
Response: { "success": true, "action": "created|updated", "path": "..." }

POST /api/apps/{name}/checked
Body: {}
Response: { "success": true, "last_checked": "2026-01-23" }
```

## Frontmatter Format

**Required** on all markdown files:

```yaml
---
last_updated: 2026-01-23
updated_by: your-app-name
change: "Brief description of what changed"
---
```

| Field | Purpose |
|-------|---------|
| `last_updated` | When this file was last modified |
| `updated_by` | Which app triggered the update |
| `change` | What changed (so other apps know if it's relevant) |

Timestamps enable sync tracking. When you update a doc, other apps can see they're behind and what changed—without reading the full file.

## Sync Tracking

Apps register with the blueprint. Each app has a `last_checked` timestamp.

**To see what's changed for an app:**
```
GET /api/changes?since=2026-01-20
```

Returns files with `last_updated` after that date, plus their `change` summaries.

**After reviewing/applying changes:**
```
POST /api/apps/your-app-name/checked
```

Updates that app's `last_checked` to today.

## Best Practices

**Keep files short.** Context limits are a hard problem. Prefer many small files over few large ones. If a file grows beyond ~100 lines, split it.

**Add cross-references.** Point to related files so agents don't waste tokens searching:

```markdown
## Related
- [schema.md](schema.md) - Database schema
- [../05-storage/limits.md](../05-storage/limits.md) - File size limits
```

**Be specific.** File names should describe content: `viewport-gate.md` not `utils.md`.

**Update, don't append.** When patterns change, update existing docs rather than adding "v2" files. Use frontmatter to track when.

**Write good change summaries.** Other apps will scan these to decide if the change is relevant to them.

## Structure

```
/core             Sequential setup (00-08), follow in order
  /00-overview    Architecture decisions, philosophy
  /01-setup       Project scaffolding, stack
  /02-frontend    React, UI, viewport gate, save pattern
  /03-convex      Backend, schema, queries
  /04-auth        better-auth setup
  /05-storage     File handling, limits
  /06-payments    Stripe integration
  /07-analytics   Usage tracking
  /08-hosting     Deployment

/domains          App-specific patterns
  /3d             Three.js, STL, meshes
  /2d             Canvas, SVG, images

/config           Registered apps and sync state
```

## Agent Workflow

1. `GET /api/index` — Understand structure and purpose
2. `GET /api/changes?since={last_checked}` — See what's new
3. `GET /api/files/core/02-frontend/viewport-gate.md` — Read relevant docs
4. Apply patterns to your app
5. `POST /api/files/{path}` — Write back improvements (with frontmatter!)
6. `POST /api/apps/{name}/checked` — Mark as up to date

## Stack

Vite + React + TypeScript + Convex + shadcn + Stripe

## Philosophy

Maximum simplicity for solo dev. No auto-save, no undo, no mobile, no collaboration.
