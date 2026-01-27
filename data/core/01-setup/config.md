---
last_updated: 2026-01-27
updated_by: vector-projector
change: "Added @convex alias for clean imports"
---

# Config Files

Essential configuration for new projects.

## Import Aliases

**Never use relative imports with `../` patterns.** Use path aliases instead.

| Alias | Path | Example |
|-------|------|--------|
| `@/*` | `./src/*` | `import { Modal } from '@/components/Modal'` |
| `@convex/*` | `./convex/*` | `import { api } from '@convex/_generated/api'` |

This keeps imports clean and avoids brittle `../../..` chains that break when files move.

## vite.config.ts

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@convex': path.resolve(__dirname, './convex'),
    },
  },
})
```

## tsconfig.json paths

Add to root `tsconfig.json`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@convex/*": ["./convex/*"]
    }
  }
}
```

Also add the same paths to `tsconfig.app.json` if it exists (Vite projects).

## .env.local

```bash
# Never commit this file
CONVEX_DEPLOYMENT=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
```