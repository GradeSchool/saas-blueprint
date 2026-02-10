---
last_updated: 2026-02-10
updated_by: vector-projector
change: "Updated structure to reflect admin, panels, new pages, storage.ts"
status: tested
tldr: "Standard /src directory layout: components, hooks, lib, pages, types."
topics: [frontend, structure, organization, react]
---

# Src Structure

Organization of the `/src` directory.

## Directory Layout

```
/src
  /components
    /admin              # Admin page content
      /sections         # Admin section components
    /modals             # Modal components
    /panels             # Step panel components (sidebar)
    /ui                 # shadcn components (auto-generated)
    AdminPage.tsx       # Admin dashboard wrapper
    UserPage.tsx        # User settings page
    PricingPage.tsx     # Pricing/purchase page
    CheckoutSuccessPage.tsx  # Post-checkout confirmation
    FaqPage.tsx         # FAQ page
    ErrorBoundary.tsx   # React error boundary
    Modal.tsx           # Base modal shell
  /hooks
    useSession.ts       # Session management hook
  /lib
    auth-client.ts      # Better Auth client
    storage.ts          # Safe localStorage/sessionStorage helpers
    utils.ts            # shadcn utilities (auto-generated)
  App.tsx               # Main app component
  main.tsx              # Entry point
  index.css             # Tailwind + shadcn CSS
```

## Folder Purposes

| Folder | Purpose |
|--------|--------|
| `/components` | App-specific components |
| `/components/admin` | Admin dashboard sections |
| `/components/modals` | All modal components |
| `/components/panels` | Sidebar step panels |
| `/components/ui` | shadcn components (don't edit manually) |
| `/hooks` | Custom React hooks |
| `/lib` | Utilities and clients |

## Key Files

| File | Purpose |
|------|--------|
| `App.tsx` | Main app shell, routing, auth state |
| `Modal.tsx` | Reusable modal wrapper |
| `useSession.ts` | Session validation, duplicate tab detection |
| `auth-client.ts` | Better Auth client configuration |
| `storage.ts` | Safe wrappers for localStorage/sessionStorage |

## Naming Conventions

- **PascalCase** for components: `UserPage.tsx`, `AuthModal.tsx`
- **camelCase** for hooks: `useSession.ts`
- **camelCase** for utilities: `storage.ts`
- One component/hook per file
- Name file same as primary export

## Import Aliases

```typescript
// Always use aliases, not relative paths
import { Modal } from '@/components/Modal'
import { useSession } from '@/hooks/useSession'
import { safeLocalGet } from '@/lib/storage'
import { api } from '@convex/_generated/api'
```

## Related

- [layout.md](layout.md) - App layout structure
- [modals.md](modals.md) - Modal system
- [../01-setup/stack.md](../01-setup/stack.md) - Initial scaffolding