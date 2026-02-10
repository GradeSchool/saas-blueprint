---
last_updated: 2026-01-23
updated_by: saas-blueprint
change: "Initial state management approach"
tldr: "React state only. No Zustand, no Redux. Keep it simple."
topics: [frontend, react, state, simplicity]
---

# State Management

React state only. No Zustand, no Redux, no complexity.

## Pattern

```tsx
const [project, setProject] = useState<Project>(initialProject)
const [isDirty, setIsDirty] = useState(false)
```

## Why No State Library

- These are focused tools, not complex apps
- React state + context covers most needs
- Adding Zustand/Redux adds complexity without clear benefit
- If state gets complex, reconsider app scope first

## shadcn Components

Install as needed:

```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add dialog
# etc.
```

## Notes

- No responsive design needed (desktop-only)
- No touch event handling
- Keep components simple and focused
