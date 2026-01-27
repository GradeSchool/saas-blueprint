---
last_updated: 2026-01-27
updated_by: vector-projector
change: "Added React Compiler to stack"
status: tested
---

# Stack

Project scaffolding for a new SaaS app.

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
| Analytics | PostHog (optional) |

## Prerequisites

- Node.js (v20+)
- npm or pnpm
- Convex account
- Stripe account

## Scaffolding Steps

**Follow these steps exactly. Order matters.**

### 1. Create Vite Project

```bash
npm create vite@latest my-app -- --template react-ts
cd my-app
npm install
```

> **Note:** If scaffolding into an existing non-empty directory, create in a temp folder and copy files over.

### 2. Install Tailwind CSS v4

```bash
npm install tailwindcss @tailwindcss/vite
```

### 3. Install React Compiler

```bash
npm install babel-plugin-react-compiler
```

### 4. Configure Vite

Update `vite.config.ts`:

```ts
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

### 5. Configure TypeScript Aliases

**CRITICAL: Must update BOTH files.**

Update `tsconfig.json` (root):

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

Also add to `tsconfig.app.json` compilerOptions:

```json
"baseUrl": ".",
"paths": {
  "@/*": ["./src/*"],
  "@convex/*": ["./convex/*"]
}
```

### 6. Setup Tailwind CSS

Replace `src/index.css` contents:

```css
@import "tailwindcss";
```

> **Note:** Tailwind v4 uses `@import` syntax, not `@tailwind base/components/utilities`.

### 7. Initialize shadcn

```bash
npx shadcn@latest init -d
```

This will:
- Create `components.json`
- Add CSS variables to `index.css`
- Create `src/lib/utils.ts`
- Install dependencies (clsx, tailwind-merge, etc.)

### 8. Setup .gitignore Patterns

**Add these patterns to `.gitignore` before committing:**

```gitignore
# Google OAuth credentials (downloaded from Google Cloud Console)
client_secret_*.json
```

Google Cloud Console lets you download OAuth credentials as a JSON file. This file contains your client secret and **must never be committed**.

See [../04-auth/google-oauth-setup.md](../04-auth/google-oauth-setup.md) for the OAuth setup workflow.

### 9. Clean Up Vite Defaults

Delete:
- `src/App.css`
- `src/assets/` folder

Update `src/App.tsx` with your app code.

### 10. Verify

```bash
npm run build
npm run lint
```

Both must pass before proceeding.

## React Compiler Rules

**React Compiler is mandatory.** It automatically memoizes components at build time.

### Rules to Follow

1. **Never mutate state or props directly**
   ```typescript
   // BAD
   state.items.push(newItem)
   
   // GOOD
   setItems([...items, newItem])
   ```

2. **Never call hooks conditionally**
   ```typescript
   // BAD
   if (condition) { useEffect(...) }
   
   // GOOD - call hook unconditionally, check inside
   useEffect(() => { if (condition) { ... } }, [condition])
   ```

3. **Components must be pure** - same props = same output

4. **Don't use `useMemo`/`useCallback`/`React.memo` for performance** - the compiler handles this automatically. Only use if you need referential stability for non-React reasons.

## Project Structure

```
/src
  /components
    /modals      # Modal components
    /ui          # shadcn components
  /hooks         # Custom React hooks
  /lib           # utilities (utils.ts, auth-client.ts)
  App.tsx
  main.tsx
  index.css      # Tailwind + shadcn CSS variables
/convex
  schema.ts
  auth.ts
  auth.config.ts
  convex.config.ts
  http.ts
  _generated/
/public
```

## Next Steps

**Follow this order:**

### Frontend (02-frontend)
1. [../02-frontend/viewport-gate.md](../02-frontend/viewport-gate.md) - Desktop-only enforcement
2. [../02-frontend/layout.md](../02-frontend/layout.md) - HeroForge-style layout
3. [../02-frontend/modals.md](../02-frontend/modals.md) - Modal system
4. [../02-frontend/src-structure.md](../02-frontend/src-structure.md) - Directory organization

### Backend (03-convex)
5. [../03-convex/setup.md](../03-convex/setup.md) - Convex initialization

### Auth (04-auth)
6. [../04-auth/better-auth.md](../04-auth/better-auth.md) - Better Auth setup

## Gotchas

| Problem | Cause | Solution |
|---------|-------|----------|
| shadcn init fails | Tailwind not installed | Run step 2 before step 7 |
| shadcn init fails | Missing import alias | Alias must be in `tsconfig.json` (root), not just `tsconfig.app.json` |
| `@import` not working | Wrong Tailwind version | Tailwind v4 uses `@import "tailwindcss"`, v3 uses `@tailwind` directives |
| Vite port conflicts | Other services running | Let user handle dev server, never assume port |
| Non-empty directory | Vite refuses to scaffold | Create in temp folder, copy files over |
| OAuth credentials leaked | Forgot to gitignore | Add `client_secret_*.json` to `.gitignore` BEFORE committing |
| Compiler errors | Violating Rules of React | Check for state mutation, conditional hooks, impure components |

## Related

- [config.md](config.md) - Environment and build config
- [../00-overview/agent-workflow.md](../00-overview/agent-workflow.md) - Agent workflow rules