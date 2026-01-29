---
last_updated: 2026-01-29
updated_by: vector-projector
change: "Initial creation - agent context efficiency guide"
status: tested
---

# Quick Start Manifest

This file tells AI agents exactly what to read to spin up a new app efficiently.

## How to Use This File

1. Identify which app type you're building
2. Fetch ONLY the listed files in order
3. Stop at section boundaries noted (don't read debug/reference sections)
4. Only fetch debug docs if something fails

---

## Standard App (~400 lines, ~8KB)

A basic SaaS app with auth, no special features.

**Read in order:**

| # | File | Lines | Stop At |
|---|------|-------|--------|
| 1 | `core/01-setup/stack.md` | ~120 | "Gotchas" section |
| 2 | `core/03-convex/setup.md` | ~60 | End |
| 3 | `core/04-auth/better-auth.md` | ~100 | End (setup only) |
| 4 | `core/02-frontend/single-session.md` | ~80 | "UI States" section |

**Checkpoint:** After these 4 files, run `npm run build`. It should pass.

---

## With Crowdfunding Mode (~500 lines)

Standard app + backer verification during signup.

**Read standard app files above, then add:**

| # | File | Lines | Notes |
|---|------|-------|-------|
| 5 | `core/04-auth/crowdfunding-mode.md` | ~100 | Full file |

---

## With Admin Panel (~550 lines)

Standard app + admin features.

**Read standard app files above, then add:**

| # | File | Lines | Notes |
|---|------|-------|-------|
| 5 | `core/02-frontend/admin-panel.md` | ~80 | Full file |
| 6 | `core/02-frontend/alerts.md` | ~70 | If using alerts |

---

## Reference Docs (Fetch When Needed)

Don't read these upfront. Fetch only when you hit a specific problem.

| File | When to Fetch |
|------|---------------|
| `core/04-auth/better-auth-debug.md` | Auth errors, 404s, CORS issues |
| `core/00-overview/hardening-patterns.md` | Security hardening pass |
| `core/02-frontend/auth-ui-state.md` | UI flashing between states |
| `core/04-auth/google-oauth-setup.md` | Setting up Google OAuth |
| `core/03-convex/rate-limiting.md` | Adding rate limits |

---

## Context Budget Guidelines

| Task | Expected Context |
|------|------------------|
| Standard app setup | 8-10KB |
| Adding one feature | +2-3KB |
| Debugging auth | +4KB |
| Full security review | +6KB |

**Warning signs you're reading too much:**
- Over 15KB of blueprint docs before writing code
- Reading "Lessons Learned" sections before trying
- Reading troubleshooting tables upfront

---

## File Conventions

Blueprint files follow these patterns:

**Setup docs** (read during initial build):
- Concise, copy-paste ready code
- Clear step ordering
- Stop at "Reference" or "Debug" sections

**Debug docs** (read when something breaks):
- Troubleshooting tables
- "Lessons Learned" sections
- Error message mappings

**Frontmatter fields:**
```yaml
context_cost: 2KB        # Estimated reading size
requires: [file.md]      # Must read first
unlocks: [file.md]       # Can read after this
type: setup | reference  # Setup = essential, Reference = as-needed
```

---

## Related

- [agent-workflow.md](agent-workflow.md) - Full agent rules
- [checkpoints.md](checkpoints.md) - Validation after each phase