Sprites.dev
Persistent Linux VMs that hibernate when idle. No Cloud Functions, no Firestore — just a normal server that sleeps.

What Sprites Are
docs.sprites.dev
Sprites are persistent, hardware-isolated Linux environments from Fly.io. Unlike serverless functions that start fresh each time, Sprites keep their filesystem and memory between requests.

Boot in 1-2 seconds, wake from hibernate instantly
100GB persistent NVMe storage included
Auto-hibernate after 30 seconds of inactivity
$0 while hibernated (pay only for active compute)
Each Sprite gets a unique public HTTPS URL
Full Linux — run anything (Node, Python, Go, SQLite, etc.)
Why This Changes Everything
No more serverless weirdness
Problem	Cloud Functions	Sprites
State	Ephemeral (need DB)	Persistent filesystem
Cold starts	100ms - seconds	Instant wake
Dev experience	Weird function format	Normal server
Storage	Need Firestore/S3	Local files, SQLite
Idle cost	$0	$0 (hibernated)
With Sprites, gradysaas.com is just a normal Node/Bun server that reads and writes JSON files. No Firebase SDK, no Cloud Functions, no external database.

Pricing
fly.io/pricing
Pay-per-use (no plan)
CPU/hour + RAM/hour + storage while active
$0 while hibernated (only storage cost, ~$0.15/GB/month)
A 4-hour intensive coding session ≈ $0.46
Low-traffic web app (30 hrs/month active) ≈ $4/month
Plans (if you need more concurrency)
Adventurer ($20/mo): 20 concurrent sprites, 450 CPU-hrs, 50GB storage
Veteran ($50/mo): 50 concurrent sprites, 800 CPU-hrs, 100GB storage
For gradysaas.com:

Single user, occasional API calls, mostly hibernated. Likely $1-5/month max.

gradysaas.com on Sprites
Dead simple architecture
Sprite filesystem:
/app
server.js (or server.ts)
/data
/recipes
auth.json
billing.json
ui-layout.json
apps.json
history/
auth-v1.json
auth-v2.json
/public
index.html (frontend)
app.js
That's it. JSON files on disk. The server reads and writes them directly. No database, no ORM, no migrations.

File Structure: JSON + Markdown
JSON for config/metadata, Markdown for content
data/
recipes.json ← Index of all recipes (metadata)
apps.json ← Registry of apps + sync status
/recipes
auth.md ← Actual recipe content
auth-convex.md
billing.md
ui-layout.md
/history
auth-v2.md ← Previous versions
auth-v1.md
Why separate JSON and Markdown?

JSON = machine-readable config, metadata, pointers, version tracking.
Markdown = human/AI-readable content (like Context7 serves docs).

JSON Files (Config & Metadata)
The "database" part
recipes.json — Recipe index
{
"auth": {
"title": "Authentication Setup",
"version": 3,
"updatedAt": "2026-01-22T...",
"updatedBy": "vectorprojector",
"file": "recipes/auth.md",
"tags": ["core", "convex", "clerk"]
},
"billing": {
"title": "Stripe Billing",
"version": 2,
"file": "recipes/billing.md",
...
}
}
Points to the markdown file. API reads this to list recipes, check versions.

apps.json — App registry
{
"vectorprojector": {
"name": "Vector Projector",
"domain": "vectorprojector.app",
"repo": "github.com/you/vectorprojector",
"recipeVersions": {
"auth": 3,
"billing": 2
}
},
"tilebuddy": {
"name": "Tile Buddy",
"domain": "tilebuddy.app",
"recipeVersions": { "auth": 2 }
}
}
Tracks which apps exist and what recipe versions they have. Compare to recipes.json to find stale apps.

Markdown Files (Content)
The actual recipes — what AI agents read
Like Context7 serves library docs, gradysaas serves your internal recipes. Markdown is perfect: human-readable, AI-readable, easy to edit.

recipes/auth.md — Example
# Authentication Setup

This recipe covers setting up Clerk auth with Convex.

## Prerequisites
- Clerk account
- Convex project

## Convex Schema

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_clerk_id", ["clerkId"]),
});
```

## Auth Provider Setup

```typescript
// src/providers/auth-provider.tsx
import { ClerkProvider } from "@clerk/clerk-react";
...
```

## Notes
- Always validate clerkId server-side
- Store minimal user data in Convex
AI agent fetches this via:

GET /api/recipes/auth → returns the markdown content

How JSON + Markdown Work Together
The interplay
Reading a recipe:
API reads recipes.json to get metadata + file path
API reads the .md file for content
Returns both to the client/agent
Pushing a recipe:
AI agent POSTs new markdown content
API saves old version to history/auth-v2.md
API writes new content to recipes/auth.md
API updates recipes.json (increment version, update timestamp)
API updates apps.json (mark pushing app as current)
Checking sync status:
Read recipes.json to get current versions
Read apps.json to get each app's versions
Compare: if app version < recipe version, it's stale
Server Code (Sketch)
Just a normal Express/Hono/Bun server
import express from 'express';
import fs from 'fs/promises';

const app = express();
app.use(express.json());

const DATA_DIR = './data';
const API_KEY = process.env.API_KEY;

// Auth middleware
app.use('/api', (req, res, next) => {
  if (req.headers['x-api-key'] !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

// Get all recipes (metadata only)
app.get('/api/recipes', async (req, res) => {
  const files = await fs.readdir(`${DATA_DIR}/recipes`);
  const recipes = await Promise.all(
    files.map(async (f) => {
      const data = JSON.parse(await fs.readFile(`${DATA_DIR}/recipes/${f}`, 'utf-8'));
      return { slug: data.slug, version: data.version, updatedAt: data.updatedAt };
    })
  );
  res.json(recipes);
});

// Get single recipe
app.get('/api/recipes/:slug', async (req, res) => {
  const data = JSON.parse(
    await fs.readFile(`${DATA_DIR}/recipes/${req.params.slug}.json`, 'utf-8')
  );
  res.json(data);
});

// Push recipes
app.post('/api/recipes', async (req, res) => {
  const { fromApp, recipes } = req.body;
  // ... increment versions, save history, update apps.json
  res.json({ success: true, updated: recipes.map(r => r.slug) });
});

// Serve frontend
app.use(express.static('public'));

app.listen(3000);
~50 lines of code. No SDK, no magic. Just read/write JSON files.

Frontend Options
Served from the same Sprite
The Sprite has a public HTTPS URL. Serve the frontend as static files from/public.

Options:
Vanilla HTML + JS: Simple, no build step. Use fetch() to call API.
Preact + HTM: React-like, no build step, runs in browser.
Built React/Vue: Build locally, copy dist/ to Sprite's /public.
Recommendation:

Start with vanilla HTML + a markdown renderer (like marked.js). You can always upgrade later. Keep it simple.

Git Workflow
Everything lives in one repo
The repo contains both code and data (JSON files). Git is your backup, your version history, your sync mechanism.

Repo structure:
gradysaas/
server.js
package.json
data/ ← JSON files (recipes, apps)
public/ ← Frontend
Source of Truth
Who owns what
What	Source of Truth	Why
Code (server, frontend)	Local PC	You develop here
Data (JSON files)	Sprite	AI agents write here
The flow:
Code changes: Edit locally → push → SSH to Sprite → pull → restart
Data changes: AI agents POST to Sprite → JSON updated → call /api/sync-to-git
Before local work: Pull from repo to get latest JSON
The /api/sync-to-git Endpoint
Backup data to GitHub from Sprite
Add an endpoint that commits and pushes JSON changes to GitHub. Call it after pushing recipes, or periodically.

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

app.post('/api/sync-to-git', async (req, res) => {
  if (req.headers['x-api-key'] !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Stage all changes in data/
    await execAsync('git add data/');

    // Check if there are changes to commit
    const { stdout } = await execAsync('git diff --cached --name-only');
    if (!stdout.trim()) {
      return res.json({ success: true, message: 'No changes to commit' });
    }

    // Commit and push
    const timestamp = new Date().toISOString();
    await execAsync(`git commit -m "data backup ${timestamp}"`);
    await execAsync('git push');

    res.json({ success: true, message: 'Pushed to GitHub' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
When to call it:
After AI agent pushes recipes (have the skill call it)
Manually via curl when you want to backup
Could add a cron job on Sprite for hourly backups
Avoiding Git Conflicts
Keep it simple
Rules:
Before working locally: Always git pull first to get latest JSON from Sprite.
Don't edit JSON locally unless necessary. Let Sprite own the data.
After pushing code: SSH to Sprite, git pull, restart server.
Stay on main: No branches. Keep it simple.
If you do get a conflict:

JSON conflicts are usually easy to resolve. Worst case, accept Sprite's version (it's the source of truth for data).

Initial Setup (One Time)
Getting the Sprite running
Create repo on GitHub with your server code, empty data/ folder, frontend
Spin up a Sprite via Fly CLI or sprites.dev dashboard
SSH into Sprite:
fly ssh console -a your-sprite-name
Clone your repo:
git clone https://github.com/you/gradysaas.git
cd gradysaas
Configure git (for pushing):
git config user.email "you@example.com"
git config user.name "Sprite"
Set up GitHub auth (deploy key or personal access token for pushing)
Install and run:
npm install
npm start (or use pm2 for persistence)
Sprites vs Firebase Approach
Side by side
Aspect	Firebase	Sprites
Storage	Firestore (document DB)	JSON files on disk
API	Cloud Functions (hate)	Normal HTTP server
Frontend hosting	Firebase Hosting	Same Sprite (static files)
Auth	Firebase Auth	API key (simple)
Dev experience	Firebase SDK, emulators	Just Node.js
Vendor lock-in	High (Firebase-specific)	Low (just files + HTTP)
Estimated cost	$0 (free tier)	$1-5/month
Open Questions
Things to figure out
Backup strategy: JSON files are on Sprite's NVMe. Fly backs up to durable storage, but should we also push to git/S3 periodically?
Frontend auth: For human access, just a password form that sets a cookie? Or skip auth entirely (API key is enough for AI access)?
Domain: Sprites get a *.fly.dev URL. Custom domain (gradysaas.com) easy to add via Fly.
Wake latency: If Sprite is hibernated, first request wakes it (1-2 seconds). Acceptable for this use case?
Why This Feels Right
No Cloud Functions: Just write a normal server.
No Firestore: JSON files are simpler, readable, portable.
Persistent state: Server stays running (or hibernates), no cold start rebuilding.
One thing: Sprite is API + frontend + storage. All in one place.
Escape hatch: If Fly dies, you have JSON files. Move anywhere.