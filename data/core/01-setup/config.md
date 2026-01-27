---
last_updated: 2026-01-27
updated_by: vector-projector
change: "Synced vite.config with React Compiler and Tailwind"
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

## tsconfig.json

Root tsconfig (references other configs):

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

## tsconfig.app.json

Add paths to compilerOptions (must match root tsconfig):

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@convex/*": ["./convex/*"]
    }
  },
  "include": ["src", "convex"]
}
```

**Note:** Include `convex` in the include array for type checking convex files.

## .env.local

```bash
# Never commit this file
# Written by `npx convex dev`
CONVEX_DEPLOYMENT=dev:your-deployment-name
VITE_CONVEX_URL=https://your-deployment.convex.cloud
VITE_CONVEX_SITE_URL=https://your-deployment.convex.site
```

## Related

- [stack.md](stack.md) - Full scaffolding steps