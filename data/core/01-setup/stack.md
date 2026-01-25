---
last_updated: 2026-01-25
updated_by: vector-projector
change: "Added .gitignore patterns section with Google OAuth credentials"
status: tested
---

# Stack

Project scaffolding for a new SaaS app.

## Technologies

| Layer | Choice |
|-------|--------|
| Build | Vite |
| UI | React + TypeScript |
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

### 3. Configure Vite

Update `vite.config.ts`:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

### 4. Configure TypeScript Aliases

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
      "@/*": ["./src/*"]
    }
  }
}
```

Also add to `tsconfig.app.json` compilerOptions:

```json
"baseUrl": ".",
"paths": {
  "@/*": ["./src/*"]
}
```

### 5. Setup Tailwind CSS

Replace `src/index.css` contents:

```css
@import "tailwindcss";
```

> **Note:** Tailwind v4 uses `@import` syntax, not `@tailwind base/components/utilities`.

### 6. Initialize shadcn

```bash
npx shadcn@latest init -d
```

This will:
- Create `components.json`
- Add CSS variables to `index.css`
- Create `src/lib/utils.ts`
- Install dependencies (clsx, tailwind-merge, etc.)

### 7. Setup .gitignore Patterns

**Add these patterns to `.gitignore` before committing:**

```gitignore
# Google OAuth credentials (downloaded from Google Cloud Console)
client_secret_*.json
```

Google Cloud Console lets you download OAuth credentials as a JSON file. This file contains your client secret and **must never be committed**.

See [../04-auth/google-oauth-setup.md](../04-auth/google-oauth-setup.md) for the OAuth setup workflow.

### 8. Clean Up Vite Defaults

Delete:
- `src/App.css`
- `src/assets/` folder

Update `src/App.tsx` with your app code.

### 9. Verify

```bash
npm run build
npm run lint
```

Both must pass before proceeding.

## Project Structure

```
/src
  /components
    /modals      # Modal components
    /ui          # shadcn components
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
| shadcn init fails | Tailwind not installed | Run step 2 before step 6 |
| shadcn init fails | Missing import alias | Alias must be in `tsconfig.json` (root), not just `tsconfig.app.json` |
| `@import` not working | Wrong Tailwind version | Tailwind v4 uses `@import "tailwindcss"`, v3 uses `@tailwind` directives |
| Vite port conflicts | Other services running | Let user handle dev server, never assume port |
| Non-empty directory | Vite refuses to scaffold | Create in temp folder, copy files over |
| OAuth credentials leaked | Forgot to gitignore | Add `client_secret_*.json` to `.gitignore` BEFORE committing |

## Related

- [config.md](config.md) - Environment and build config
- [../00-overview/agent-workflow.md](../00-overview/agent-workflow.md) - Agent workflow rules