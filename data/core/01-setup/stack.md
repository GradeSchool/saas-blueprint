---
last_updated: 2026-01-23
updated_by: saas-blueprint
change: "Initial stack and scaffolding"
---

# Stack

Project scaffolding for a new SaaS app.

## Technologies

| Layer | Choice |
|-------|--------|
| Build | Vite |
| UI | React + TypeScript |
| Components | shadcn/ui |
| Backend | Convex |
| Auth | better-auth |
| Payments | Stripe |
| Analytics | PostHog (optional) |

## Prerequisites

- Node.js (v20+)
- npm or pnpm
- Convex account
- Stripe account

## Quick Start

```bash
# Create Vite project
npm create vite@latest my-app -- --template react-ts
cd my-app

# Install dependencies
npm install
npm install convex

# Init Convex
npx convex init

# Add shadcn/ui
npx shadcn@latest init
```

## Project Structure

```
/src
  /components
    /ui          # shadcn components
  /lib           # utilities
  App.tsx
  main.tsx
/convex
  schema.ts
  functions/
/public
```
