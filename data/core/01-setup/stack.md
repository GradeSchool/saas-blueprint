---
last_updated: 2026-01-29
updated_by: vector-projector
change: "Consolidated config.md, added frontmatter metadata, streamlined for agents"
status: tested
context_cost: 3KB
type: setup
requires: []
unlocks: [core/03-convex/setup.md]
tldr: "Project scaffolding: Vite + React 19 + TypeScript + shadcn. Start here for new apps."
topics: [setup, vite, react, typescript, shadcn, stack]
---

# Stack

Project scaffolding for a new SaaS app.

---

## Technologies

| Layer | Choice |
|-------|--------|
| Build | Vite |
| UI | React 19 + TypeScript |
| Optimization | React Compiler 1.0 |
| Styling | Tailwind CSS v4 |
| Components | shadcn/ui |
| Backend | Convex |
| Auth | Better Auth |
| Payments | Stripe |

---

## Scaffolding Steps

### 1. Create Vite Project

```bash
npm create vite@latest my-app -- --template react-ts
cd my-app
npm install
```

### 2. Install Dependencies

```bash
npm install tailwindcss @tailwindcss/vite babel-plugin-react-compiler
```

### 3. Configure Vite

**vite.config.ts:**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler', { target: '19' }]],
      },
    }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@convex': path.resolve(__dirname, './convex'),
    },
  },
})
```

### 4. Configure TypeScript

**tsconfig.json** (root):

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ],
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@convex/*": ["./convex/*"]
    }
  }
}
```

**tsconfig.app.json** (add to compilerOptions):

```json
"baseUrl": ".",
"paths": {
  "@/*": ["./src/*"],
  "@convex/*": ["./convex/*"]
}
```

### 5. Setup Tailwind CSS

Replace `src/index.css`:

```css
@import "tailwindcss";
```

### 6. Initialize shadcn

```bash
npx shadcn@latest init -d
```

### 7. Setup .gitignore

Add:

```gitignore
client_secret_*.json
```

### 8. Clean Up

Delete: `src/App.css`, `src/assets/`

### 9. Verify

```bash
npm run build && npm run lint
```

---

## Import Aliases

**Always use aliases, never relative `../` imports:**

| Alias | Path |
|-------|------|
| `@/*` | `./src/*` |
| `@convex/*` | `./convex/*` |

---

## Project Structure

```
/src
  /components
    /modals
    /ui
  /hooks
  /lib
  App.tsx
  main.tsx
  index.css
/convex
  schema.ts
  auth.ts
  _generated/
```

---

## React Compiler Rules

1. Never mutate state/props directly
2. Never call hooks conditionally
3. Components must be pure
4. Don't use useMemo/useCallback for performance (compiler handles it)

---

## Related

- [../03-convex/setup.md](../03-convex/setup.md) - Next: Convex setup
- [../00-overview/quickstart-manifest.md](../00-overview/quickstart-manifest.md) - Reading guide