---
last_updated: 2026-01-23
updated_by: saas-blueprint
change: "Initial config file templates"
---

# Config Files

Essential configuration for new projects.

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
    },
  },
})
```

## tsconfig.json paths

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

## .env.local

```bash
# Never commit this file
CONVEX_DEPLOYMENT=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
```
