---
last_updated: 2026-01-23
updated_by: vector-projector
change: "Added temp file trick for API posts"
status: verified
---

# Agent Workflow

**READ THIS FIRST.** This document defines how AI agents interact with the blueprint.

## The Golden Rule

**Never update the blueprint with untested code.**

The blueprint is a source of truth. If you add broken patterns, every future agent (and app) inherits your mistakes. Verify first, document second.

## Workflow Sequence

```
1. READ    - Fetch relevant docs from blueprint
2. IMPLEMENT - Write code in target app
3. VERIFY  - Run build/lint, user tests manually
4. CONFIRM - User says it works
5. WRITE   - POST updates back to blueprint
6. MARK    - POST to /api/apps/{name}/checked
```

### Step 1: Read

```bash
GET /api/index                    # Understand structure
GET /api/changes?since={date}     # See what is new
GET /api/files/{path}             # Read specific docs
```

Check the `status` field in frontmatter:
- `draft` - Untested, use with caution
- `tested` - Works in at least one app
- `verified` - Works in multiple apps, battle-tested

### Step 2: Implement

Apply patterns to your target app. Adapt as needed - the blueprint provides patterns, not copy-paste code.

### Step 3: Verify

**Always run:**
```bash
npm run build
npm run lint
```

If either fails, fix before proceeding.

### Step 4: Confirm

**Wait for the user.** They run the dev server, they test the UI, they confirm it works. Do not skip this step.

### Step 5: Write Back

Only after user confirmation:

```bash
POST /api/files/{path}
Body: {
  "content": "...",
  "source": "your-app-name"
}
```

**Frontmatter is required:**
```yaml
---
last_updated: 2026-01-23
updated_by: your-app-name
change: "Brief description of what changed"
status: tested
---
```

#### The Temp File Trick

**Problem:** Inline JSON in curl commands requires painful escaping. Quotes, newlines, and special characters cause shell errors.

**Solution:** Write JSON to a temp file, use `curl -d @filename`, then delete.

```bash
# Step 1: Write JSON to temp file (use your editor/Write tool)
# temp-update.json contains:
# {
#   "content": "Your markdown content here...",
#   "source": "your-app-name"
# }

# Step 2: POST using the file
curl -X POST http://localhost:3001/api/files/path/to/doc.md \
  -H "Content-Type: application/json" \
  -d @temp-update.json

# Step 3: Clean up
rm temp-update.json
```

This avoids escaping hell and makes the content readable/editable.

### Step 6: Mark Synced

```bash
POST /api/apps/{name}/checked
Body: {}
```

Simple POST with empty body - no escaping issues here:
```bash
curl -X POST http://localhost:3001/api/apps/your-app/checked \
  -H "Content-Type: application/json" -d "{}"
```

## Registering a New App

Apps must be registered before using `/api/apps/{name}/checked`.

**Option 1:** Edit `config/apps.json` directly (use temp file trick for complex JSON).

**Option 2:** Merge with existing apps (read first, add yours, write back).

## Things Agents Should NEVER Do

1. **Run the dev server.** The user handles this. Port conflicts and process management are their domain.

2. **Handle git operations** unless explicitly asked. No commits, no pushes.

3. **Trust draft docs blindly.** Check the status field. If it is missing or says `draft`, verify extra carefully.

4. **Update blueprint before verification.** This creates technical debt for every future agent.

## Gotchas We Have Learned

| Problem | Solution |
|---------|----------|
| shadcn init fails | Install Tailwind first, configure aliases in BOTH tsconfig files |
| Vite port unpredictable | Never assume port 5173, let user handle dev server |
| App registration fails | App must exist in config/apps.json first |
| Curl JSON escaping hell | Use temp file trick (write file, `curl -d @file`, delete) |

## Related

- [../index.md](../index.md) - Blueprint overview and API reference
- [../01-setup/stack.md](../01-setup/stack.md) - Project scaffolding