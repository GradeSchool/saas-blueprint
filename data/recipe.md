# SaaS Blueprint

## The Concept

**AI-mediated code sharing**

Traditional approaches to shared code (monorepos, npm packages, submodules) all have pain points. This approach is different: AI mediates all code sharing.

saas-blueprint is a **knowledge repository** — not a code repository. It stores "recipes" (code snippets + prompts + context) that AI agents can read and apply. Each SaaS app lives in its own discrete repo, fully independent.

## How It Works

1. **Recipes** are markdown files containing code patterns, setup instructions, and context
2. **AI agents** fetch recipes via API and apply them to target repos
3. **No dependencies** — code is copied and adapted, not imported
4. **Version tracking** — recipes have versions, apps track which version they're using

---

## Reading Data

### List all files
```
GET /api/files
```
Returns: `{ "files": [{ "name": "auth.md", "path": "recipes/auth.md", "type": "file" }, ...] }`

### Get a specific file
```
GET /api/files/{path}
```
Examples:
- `GET /api/files/recipes/auth.md` — returns file content
- `GET /api/files/recipes` — returns directory listing

---

## Writing Data

### Create or update a recipe
```
POST /api/recipes/{name}
Content-Type: application/json

{
  "content": "# Your markdown content here...",
  "source": "your-app-name"
}
```

- If `recipes/{name}.md` exists, it will be **updated**
- If it doesn't exist, it will be **created**
- Response: `{ "success": true, "action": "created" | "updated", "path": "recipes/{name}.md" }`

### Rules for writing
1. `name` should be lowercase, hyphenated (e.g., `auth`, `billing-stripe`, `ui-components`)
2. `content` must be valid markdown
3. `source` identifies which app/agent is writing (for tracking)

---

## Recipe Format

Recipes are markdown files with:
- **Title** — `# Recipe Name`
- **Overview** — What this recipe does
- **Prerequisites** — What's needed before applying
- **Code blocks** — With file paths in comments (e.g., `// src/lib/auth.ts`)
- **Notes** — Customization tips, gotchas

---

## Workflow

**Reading (applying a recipe to your app):**
1. `GET /api/files` to see available recipes
2. `GET /api/files/recipes/{name}.md` to fetch the recipe
3. Apply the code/patterns to your app

**Writing (sharing knowledge back):**
1. You discover a pattern worth sharing
2. Format it as markdown following the recipe format
3. `POST /api/recipes/{name}` with the content
4. Recipe is now available for all apps

---

## Status

Work in progress. This system is being built incrementally.
