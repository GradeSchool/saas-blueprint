# SaaS Blueprint

## What This Is

A knowledge repository for sharing code patterns across multiple SaaS apps. AI agents fetch docs via API and apply them to target apps.

## Architecture

- **Frontend**: React + Vite (port 5173 in dev)
- **Backend**: Express server (port 3001)
- **Data**: Markdown files in `/data` directory

## Running the App

```bash
npm install
npm run dev      # Runs both Vite and Express with hot reload
npm run build    # Production build
npm run start    # Production mode
```

## Key API Endpoints

- `GET /api/index` - Root index (start here)
- `GET /api/files` - List all files
- `GET /api/files/{path}` - Get specific file or directory
- `POST /api/files/{path}` - Create or update a file (body: `{ "content": "...", "source": "app-name" }`)

## Data Structure

```
/data
  index.md                    # Root index - start here
  /core                       # Sequential setup (00-08)
    /00-overview/
      architecture.md
      philosophy.md
    /01-setup/
      stack.md
      config.md
    /02-frontend/
      viewport-gate.md
      save-pattern.md
      state.md
    /03-convex/
      schema.md
      queries.md
    /04-auth/
      better-auth.md
    /05-storage/
      convex-storage.md
      limits.md
    /06-payments/
      stripe.md
    /07-analytics/
      posthog.md
    /08-hosting/
      deployment.md
  /domains                    # App-specific patterns
    /3d/
    /2d/
```

## Development Notes

- tsx --watch handles server hot reload
- Vite handles frontend HMR
- Always run `npm run build` to verify changes compile
