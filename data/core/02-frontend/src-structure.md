---
last_updated: 2026-01-23
updated_by: vector-projector
change: "Initial src directory structure documentation"
status: tested
---

# Src Structure

Organization of the `/src` directory.

## Directory Layout

```
/src
  /components
    /modals           <- Specific modal components
      TestModal.tsx
      ConfirmModal.tsx
    /ui               <- shadcn components (auto-generated)
    Modal.tsx         <- Base modal shell
    UserPage.tsx      <- User settings page
  /lib
    utils.ts          <- shadcn utilities (auto-generated)
  App.tsx             <- Main app component
  main.tsx            <- Entry point
  index.css           <- Tailwind + shadcn CSS
```

## Conventions

### Components

| Location | Purpose |
|----------|--------|
| `/components` | App-specific components |
| `/components/modals` | All modal components |
| `/components/ui` | shadcn components (don't edit manually) |

### Naming

- PascalCase for components: `UserPage.tsx`, `TestModal.tsx`
- One component per file
- Name file same as component

### Base vs Specific Components

Base components (like `Modal.tsx`) are reusable shells. Specific components (like `TestModal.tsx`) import the base and provide content.

```
Modal.tsx          <- Base: handles backdrop, escape, title
/modals
  TestModal.tsx    <- Specific: uses Modal, adds content
  ConfirmModal.tsx <- Specific: uses Modal, adds content
```

## What Goes Where

| File Type | Location |
|-----------|----------|
| Main app shell | `App.tsx` |
| Page components | `/components` (e.g., `UserPage.tsx`) |
| Modal components | `/components/modals` |
| Reusable UI | `/components` or `/components/ui` |
| Utilities | `/lib` |
| Styles | `index.css` (Tailwind handles most) |

## Future Additions

As the app grows, consider:

```
/src
  /components
  /hooks            <- Custom React hooks
  /lib
  /types            <- Shared TypeScript types
  /stores           <- State management (if needed)
```

Add these only when needed. Don't pre-create empty folders.

## Related

- [layout.md](layout.md) - App layout structure
- [modals.md](modals.md) - Modal system
- [../01-setup/stack.md](../01-setup/stack.md) - Initial scaffolding