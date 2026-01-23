# SaaS Blueprint

## What This Is

A knowledge repository for sharing code patterns across multiple SaaS apps. Instead of monorepos, npm packages, or submodules, AI agents mediate all code sharing.

## The Concept

- **Recipes** are markdown files containing code patterns, setup instructions, and context
- AI agents fetch recipes via API and apply them to target apps
- Each SaaS app lives in its own discrete repo, fully independent
- No dependencies - code is copied and adapted, not imported

## Architecture

- **Frontend**: React + Vite (port 5173 in dev)
- **Backend**: Express server (port 3001)
- **Data**: JSON and markdown files in `/data` directory

## Running the App

```bash
npm install
npm run dev      # Runs both Vite and Express with hot reload
npm run build    # Production build
npm run start    # Production mode
```

## Key API Endpoints

- `GET /api/recipe` - System overview (the main entry point for agents)
- `GET /api/files` - List all data files
- `GET /api/files/{path}` - Get a specific file or directory
- `POST /api/recipes/{name}` - Create or update a recipe

## Project Structure

```
/data           # Runtime data (recipes, config)
  /recipes      # Recipe markdown files
/server         # Express backend
/src            # React frontend
```

## Development Notes

- tsx --watch handles server hot reload
- Vite handles frontend HMR
- Always run `npm run build` to verify changes compile
- Lint has some pre-existing warnings in UI components (can be ignored)
