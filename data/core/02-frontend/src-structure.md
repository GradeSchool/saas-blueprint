---
last_updated: 2026-01-27
updated_by: vector-projector
change: "Added /hooks folder, AdminPage, auth-client"
status: tested
---

# Src Structure

Organization of the `/src` directory.

## Directory Layout

```
/src
  /components
    /modals           # Specific modal components
      AuthModal.tsx
      TestModal.tsx
    /ui               # shadcn components (auto-generated)
    Modal.tsx         # Base modal shell
    AdminPage.tsx     # Admin dashboard (admins only)
    UserPage.tsx      # User settings page
  /hooks
    useSession.ts     # Session management hook
  /lib
    auth-client.ts    # Better Auth client
    utils.ts          # shadcn utilities (auto-generated)
  App.tsx             # Main app component
  main.tsx            # Entry point
  index.css           # Tailwind + shadcn CSS
```

## Conventions

### Components

| Location | Purpose |
|----------|--------|
| `/components` | App-specific components |
| `/components/modals` | All modal components |
| `/components/ui` | shadcn components (don't edit manually) |

### Hooks

| Location | Purpose |
|----------|--------|
| `/hooks` | Custom React hooks |

Example: `useSession.ts` handles session validation, duplicate tab detection, kicked state.

### Naming

- PascalCase for components: `UserPage.tsx`, `AuthModal.tsx`
- camelCase for hooks: `useSession.ts`
- One component/hook per file
- Name file same as export

### Import Aliases

```typescript
// Use aliases, not relative paths
import { Modal } from '@/components/Modal'
import { useSession } from '@/hooks/useSession'
import { api } from '@convex/_generated/api'
```

## What Goes Where

| File Type | Location |
|-----------|----------|
| Main app shell | `App.tsx` |
| Page components | `/components` (e.g., `UserPage.tsx`, `AdminPage.tsx`) |
| Modal components | `/components/modals` |
| Custom hooks | `/hooks` |
| Auth client | `/lib/auth-client.ts` |
| Utilities | `/lib` |

## Related

- [layout.md](layout.md) - App layout structure
- [modals.md](modals.md) - Modal system
- [../01-setup/stack.md](../01-setup/stack.md) - Initial scaffolding