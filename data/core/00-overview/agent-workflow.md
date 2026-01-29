---
last_updated: 2026-01-29
updated_by: vector-projector
change: "Added quickstart manifest reference, context efficiency section"
status: verified
context_cost: 2KB
type: setup
---

# Agent Workflow

**READ THIS FIRST.** Defines how AI agents interact with the blueprint.

---

## Quick Start

**For spinning up a new app:** Read [quickstart-manifest.md](quickstart-manifest.md) first. It tells you exactly which files to read and in what order.

**For checking progress:** Read [checkpoints.md](checkpoints.md) to validate each setup phase.

---

## The Golden Rule

**Never update the blueprint with untested code.**

---

## Context Efficiency

Blueprint files have two types:

| Type | Frontmatter | When to Read |
|------|-------------|---------------|
| `setup` | `type: setup` | During initial build |
| `reference` | `type: reference` | Only when something breaks |

**Check `context_cost` in frontmatter** to estimate how much context a file uses.

**Warning signs you're reading too much:**
- Over 15KB of blueprint docs before writing code
- Reading "Lessons Learned" sections before trying
- Reading troubleshooting tables upfront

---

## Workflow Sequence

```
1. READ    - Fetch docs per quickstart-manifest.md
2. IMPLEMENT - Write code in target app  
3. VERIFY  - Run build/lint, user tests manually
4. CONFIRM - User says it works
5. WRITE   - POST updates back to blueprint
6. MARK    - POST to /api/apps/{name}/checked
```

### Step 1: Read

```bash
GET /api/files/core/00-overview/quickstart-manifest.md  # What to read
GET /api/files/{path}                                    # Read specific docs
```

Check frontmatter:
- `type: setup` - Read during initial build
- `type: reference` - Read only when debugging
- `context_cost` - Estimate reading size

### Step 2: Implement

Apply patterns to your target app. Adapt as needed.

### Step 3: Verify

```bash
npm run build
npm run lint
```

### Step 4: Confirm

**Wait for the user.** They test the UI, they confirm it works.

### Step 5: Write Back

Only after user confirmation:

```bash
POST /api/files/{path}
Body: { "content": "...", "source": "your-app-name" }
```

**Required frontmatter:**
```yaml
---
last_updated: 2026-01-29
updated_by: your-app-name
change: "Brief description"
status: tested
context_cost: 2KB
type: setup | reference
---
```

### Step 6: Mark Synced

```bash
POST /api/apps/{name}/checked
Body: {}
```

---

## Things Agents Should NEVER Do

1. **Run the dev server** - User handles this
2. **Handle git operations** unless asked
3. **Trust reference docs blindly** - They're for debugging, not setup
4. **Update blueprint before verification**

---

## Port Convention

| Service | Port |
|---------|------|
| Blueprint frontend | 4001 |
| SaaS apps (Vite) | 5173 |
| Blueprint API | 3001 |

---

## Related

- [quickstart-manifest.md](quickstart-manifest.md) - What files to read
- [checkpoints.md](checkpoints.md) - Validation points
- [../01-setup/stack.md](../01-setup/stack.md) - Project scaffolding