A secure, AI-readable knowledge repository that stores "recipes" for building SaaS products. No monorepo, no submodules — just discrete repos informed by shared knowledge via AI agents.

The Concept
AI-mediated code sharing
Traditional approaches to shared code (monorepos, npm packages, submodules) all have pain points. This approach is different: AI mediates all code sharing.

gradysaas.com is a knowledge repository — not a code repository. It stores "recipes" (code snippets + prompts + context) that AI agents can read and apply. Each SaaS app lives in its own discrete repo, fully independent, but informed by shared knowledge.

What gradysaas.com Contains
The knowledge repository structure
1. App Registry
A manually-configured list of all SaaS apps. Each entry includes the app name, domain, repo location, Convex project ID, and which core features it has implemented.

2. Core Feature Recipes
Markdown documents describing how to implement each core feature. Includes:

Code snippets (with timestamps/versions)
AI prompts for implementation
Context about why it's built this way
Dependencies and prerequisites
3. Sync Status Tracking
For each app, tracks which version of each core feature it has. When a recipe is updated, the system knows which apps are now "out of date."

Core Features (Examples)
What might be tracked as "core"
Each SaaS app is 100% discrete

Every app has its own: domain, Convex account, Google account, social media accounts, Stripe account, etc. They are completely independent businesses that happen to share knowledge via gradysaas.com.

This means each app needs its own Convex account (not just a project under one account). The recipes describe how to set up Convex, but each app manages its own instance.

Auth & Users
Convex auth setup
User table schema
Session management
Protected routes
Billing
Stripe integration
Subscription tiers
One-off purchases
Webhook handling
UI Layout
Sidebar structure
Header/nav patterns
Theme/dark mode
Responsive layout
Admin Panel
User management
Analytics dashboard
Settings pages
Billing management
The Workflow
How it works in practice
Starting a new SaaS app:
Create a new discrete repo (e.g., tilebuddy.app)
AI agent connects to gradysaas.com via API
Agent pulls all core feature recipes
Agent implements the template/boilerplate
You focus on app-specific features
Register the new app in gradysaas.com
Updating a core feature:
While working on App A, you improve a core feature
AI agent pushes the updated recipe to gradysaas.com
gradysaas.com marks other apps as "out of date"
Later, when working on App B, you see the notification
AI agent pulls the update and applies it (with your approval)
Key principle:

Human stays in the loop. gradysaas.com advises, you decide. No automatic updates. Each repo is fully independent.

Inspiration: Context7
A similar pattern already exists — Context7 MCP Server
What Context7 does:
Context7 is an MCP (Model Context Protocol) server that serves up-to-date library documentation to AI agents. When you add "use context7" to a prompt, it fetches the latest docs for that library and injects them into the AI's context window.

AI agent requests docs for a library (e.g., "FastAPI")
Context7 fetches the latest official documentation
Docs are injected into the prompt context
AI responds with accurate, up-to-date code
How gradysaas.com is similar:
We're proposing the same pattern, but for our own internal recipes instead of public library docs:

AI agent requests recipe for a core feature (e.g., "auth setup")
gradysaas.com serves the latest recipe (code snippets + prompts)
Recipe is injected into the AI's context
AI implements the feature using our patterns
Key difference:

Context7 serves public documentation for open-source libraries. gradysaas.com serves private recipes for our own SaaS patterns. Same mechanism, different content.

Platform: Sprites (Decided)
docs.sprites.dev
gradysaas.com runs on a Fly.io Sprite — a persistent Linux VM that hibernates when idle. No Firebase, no Cloud Functions, no external database.

Simple Node.js server (Express/Hono)
JSON files for config/metadata
Markdown files for recipe content
All stored on Sprite's persistent filesystem
Git repo for backup + version history
~$1-5/month (mostly hibernated)
See the Sprites.dev page for full architecture details.

API Key Authentication
All requests require a valid key
Every API request must include a valid API key. gradysaas.com needs to:

Generate keys: Admin UI to create new API keys
Validate keys: Middleware checks every request
Revoke keys: Ability to disable compromised keys
data/api-keys.json
{
"keys": {
"gsk_abc123...": {
"name": "vectorprojector-agent",
"createdAt": "2026-01-22T...",
"active": true
},
"gsk_def456...": {
"name": "tilebuddy-agent",
"active": true
}
}
}
Usage:

curl -H "x-api-key: gsk_abc123..." https://gradysaas.com/api/recipes

Recipe Granularity
Flexible structure — as granular as needed
Granularity depends on the core feature being described. Some features are simple (one file), others are complex (multiple files, organized in folders).

data/recipes/
# Simple recipe (single file)
theme.md
# Medium recipe (few files)
auth.md
auth-convex.md
auth-ui.md
# Complex recipe (folder)
billing/
index.md ← overview
stripe-setup.md
subscriptions.md
one-off-purchases.md
webhooks.md
convex-schema.md
recipes.json reflects this:
{
"theme": { "file": "recipes/theme.md", "version": 1 },
"auth": { "file": "recipes/auth.md", "version": 3 },
"auth-convex": { "file": "recipes/auth-convex.md", "version": 3 },
"billing": {
"file": "recipes/billing/index.md",
"version": 2,
"children": ["stripe-setup", "subscriptions", "one-off-purchases", "webhooks", "convex-schema"]
}
}
AI Agent Push Flow
How recipes get created/updated
AI agents push new or updated recipe content via POST requests.

POST /api/recipes
{
"fromApp": "vectorprojector",
"recipes": [
{
"slug": "auth",
"title": "Authentication Setup",
"content": "# Auth Setup\n\nThis recipe..."
},
{
"slug": "auth-convex",
"title": "Auth Convex Schema",
"content": "# Convex Schema\n\n```typescript..."
}
]
}
What the server does:
Validate API key
For each recipe: save old version to history/, write new .md file
Update recipes.json (increment version, update timestamp)
Update apps.json (mark fromApp as current)
Return list of other apps now out of date
Open Questions
Still to figure out
Nested recipe handling: When a folder-based recipe (like billing/) is updated, how do we version the whole vs individual files?
Conflict resolution: If two apps push different changes to the same recipe, last write wins? Or flag for manual review?
Frontend auth: API keys are for agents. For human access to the UI, simple password? Session cookie?
Recipe discovery: How does an AI agent know what recipes exist? GET /api/recipes/list? Or a special index endpoint?
Why This Approach
What makes it appealing
No monorepo complexity: Each app is a simple, discrete repo. No Turborepo, no workspaces, no package publishing.
No sync nightmares: Apps don't auto-update. You choose when to pull changes, with AI assistance.
AI-native: Built for the age of AI coding agents. The "shared code" is knowledge that AI can read and apply, not packages to import.
Human in control: gradysaas.com advises, you decide. No magic, no surprises.
Flexible: Each app can diverge from core if needed. The recipes are guidance, not constraints.
Comparison to Traditional Approaches
Approach	Sync Method	Complexity	Independence
Monorepo	Automatic (same build)	High (tooling)	Low
npm packages	Version bumps	Medium	Medium
Submodules	Git pulls	High (pain)	Medium
gradysaas.com	AI-mediated recipes	Low (just docs)	High