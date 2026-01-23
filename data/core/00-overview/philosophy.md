---
last_updated: 2026-01-23
updated_by: saas-blueprint
change: "Initial philosophy and principles"
---

# Philosophy

Maximum simplicity for a solo dev. Every added layer must justify its complexity cost.

## Multi-App Strategy

"Carpet bomb" approach:
- 5 focused apps > 1 complex app
- Shared patterns via this blueprint
- Cross-pollination of user base
- Risk spread across products

## What We're NOT Building

- Auto-save
- Undo/redo
- Offline support
- Local-first sync
- Collaborative editing
- Mobile/responsive layouts

Each of these is a significant complexity cost with marginal benefit for focused, single-user desktop tools.

## Guiding Principles

1. **Users are adults** - They can learn to save
2. **Simple > Feature-rich** - Cut scope aggressively
3. **One service when possible** - Convex for backend + storage
4. **Desktop-only is OK** - Know your users
5. **Ship multiple small apps** - Don't over-invest in one
