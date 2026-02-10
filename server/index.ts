import express from 'express'
import cors from 'cors'
import path from 'path'
import fs from 'fs/promises'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// Serve static files from the Vite build
app.use(express.static(path.join(__dirname, '../dist')))

// API routes
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Hello from Express!' })
})

app.get('/api/endpoints', (_req, res) => {
  res.json({
    endpoints: [
      { method: 'GET', path: '/api/health', description: 'Health check' },
      { method: 'GET', path: '/api/endpoints', description: 'List all endpoints' },
      { method: 'GET', path: '/api/index', description: 'Root index - start here' },
      { method: 'GET', path: '/api/metadata', description: 'All file metadata in one call (no bodies)' },
      { method: 'GET', path: '/api/search?q={term}', description: 'Full-text search with snippets' },
      { method: 'GET', path: '/api/topics', description: 'List all unique topics' },
      { method: 'GET', path: '/api/topics/{topic}', description: 'Files tagged with a topic' },
      { method: 'GET', path: '/api/files', description: 'List all data files' },
      { method: 'GET', path: '/api/files/{path}', description: 'Get a specific file or directory' },
      { method: 'POST', path: '/api/files/{path}', description: 'Create or update a file' },
      { method: 'GET', path: '/api/changes?since=YYYY-MM-DD', description: 'List files updated since date' },
      { method: 'GET', path: '/api/apps', description: 'List registered apps' },
      { method: 'GET', path: '/api/apps/{name}', description: 'Get app details' },
      { method: 'POST', path: '/api/apps/{name}', description: 'Register or update an app' },
      { method: 'POST', path: '/api/apps/{name}/checked', description: 'Mark app as up to date' }
    ]
  })
})

app.get('/api/index', async (_req, res) => {
  try {
    const content = await fs.readFile(path.join(DATA_DIR, 'index.md'), 'utf-8')
    res.type('text/markdown').send(content)
  } catch {
    res.status(404).send('Index not found')
  }
})

const DATA_DIR = path.join(__dirname, '../data')
const APPS_FILE = path.join(DATA_DIR, 'config/apps.json')

// Helper: Parse YAML frontmatter from markdown
function parseFrontmatter(content: string): { frontmatter: Record<string, string | string[]> | null, body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)
  if (!match) return { frontmatter: null, body: content }

  const frontmatter: Record<string, string | string[]> = {}
  match[1].split(/\r?\n/).forEach(line => {
    const colonIndex = line.indexOf(':')
    if (colonIndex === -1) return

    const key = line.slice(0, colonIndex).trim()
    let value = line.slice(colonIndex + 1).trim()

    if (!key) return

    // Handle YAML arrays: [item1, item2, item3]
    if (value.startsWith('[') && value.endsWith(']')) {
      const arrayContent = value.slice(1, -1)
      frontmatter[key] = arrayContent.split(',').map(item =>
        item.trim().replace(/^["']|["']$/g, '')
      ).filter(Boolean)
    }
    // Handle quoted strings
    else if ((value.startsWith('"') && value.endsWith('"')) ||
             (value.startsWith("'") && value.endsWith("'"))) {
      frontmatter[key] = value.slice(1, -1)
    }
    // Plain value
    else {
      frontmatter[key] = value
    }
  })
  return { frontmatter, body: match[2] }
}

interface AppConfig {
  name: string
  github?: string
  convex?: string
  vercel?: string
  url?: string
  last_checked: string
}

// Helper: Read apps config
async function getAppsConfig(): Promise<{ apps: Record<string, AppConfig> }> {
  try {
    const content = await fs.readFile(APPS_FILE, 'utf-8')
    return JSON.parse(content)
  } catch {
    return { apps: {} }
  }
}

// Helper: Write apps config
async function saveAppsConfig(config: { apps: Record<string, AppConfig> }) {
  await fs.writeFile(APPS_FILE, JSON.stringify(config, null, 2))
}

// Helper: Get today's date as YYYY-MM-DD
function today(): string {
  return new Date().toISOString().split('T')[0]
}

async function listFilesRecursive(dir: string, base = ''): Promise<{name: string, path: string, type: 'file' | 'dir'}[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const results: {name: string, path: string, type: 'file' | 'dir'}[] = []
  for (const entry of entries) {
    const relativePath = base ? `${base}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      results.push({ name: entry.name, path: relativePath, type: 'dir' })
      results.push(...await listFilesRecursive(path.join(dir, entry.name), relativePath))
    } else {
      results.push({ name: entry.name, path: relativePath, type: 'file' })
    }
  }
  return results
}

app.get('/api/files', async (_req, res) => {
  try {
    const files = await listFilesRecursive(DATA_DIR)
    res.json({ files })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

app.get(/^\/api\/files\/(.+)$/, async (req, res) => {
  try {
    const filepath = req.params[0]
    const filePath = path.join(DATA_DIR, filepath)
    const stat = await fs.stat(filePath)
    if (stat.isDirectory()) {
      const entries = await fs.readdir(filePath, { withFileTypes: true })
      res.json({
        files: entries.map(e => ({
          name: e.name,
          path: `${filepath}/${e.name}`,
          type: e.isDirectory() ? 'dir' : 'file'
        }))
      })
    } else {
      const content = await fs.readFile(filePath, 'utf-8')
      const ext = path.extname(filepath)
      if (ext === '.json') {
        res.json(JSON.parse(content))
      } else {
        res.type('text/plain').send(content)
      }
    }
  } catch {
    res.status(404).json({ error: 'File not found' })
  }
})

// POST /api/files/{path} - Create or update a file
app.post(/^\/api\/files\/(.+)$/, async (req, res) => {
  try {
    const filepath = req.params[0]
    const { content, source } = req.body

    if (!content) {
      return res.status(400).json({ success: false, error: 'content is required' })
    }

    const filePath = path.join(DATA_DIR, filepath)

    // Ensure parent directory exists
    const dir = path.dirname(filePath)
    await fs.mkdir(dir, { recursive: true })

    // Check if file exists to determine action
    let action: 'created' | 'updated' = 'created'
    try {
      await fs.access(filePath)
      action = 'updated'
    } catch {
      // File doesn't exist, will be created
    }

    await fs.writeFile(filePath, content)

    res.json({
      success: true,
      action,
      path: filepath,
      source: source || 'unknown'
    })
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) })
  }
})

// GET /api/changes - List files updated since date
app.get('/api/changes', async (req, res) => {
  try {
    const since = req.query.since as string
    if (!since) {
      return res.status(400).json({ error: 'since parameter required (YYYY-MM-DD)' })
    }

    const sinceDate = new Date(since)
    const files = await listFilesRecursive(DATA_DIR)
    const mdFiles = files.filter(f => f.type === 'file' && f.name.endsWith('.md'))

    const changes: { path: string, last_updated: string, updated_by: string, change: string }[] = []

    for (const file of mdFiles) {
      const content = await fs.readFile(path.join(DATA_DIR, file.path), 'utf-8')
      const { frontmatter } = parseFrontmatter(content)

      if (frontmatter?.last_updated && typeof frontmatter.last_updated === 'string') {
        const fileDate = new Date(frontmatter.last_updated)
        if (fileDate > sinceDate) {
          changes.push({
            path: file.path,
            last_updated: frontmatter.last_updated,
            updated_by: (frontmatter.updated_by as string) || 'unknown',
            change: (frontmatter.change as string) || ''
          })
        }
      }
    }

    res.json({ changes })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// GET /api/metadata - All frontmatter (no file bodies)
app.get('/api/metadata', async (_req, res) => {
  try {
    const allFiles = await listFilesRecursive(DATA_DIR)
    const mdFiles = allFiles.filter(f => f.type === 'file' && f.name.endsWith('.md'))

    const files: {
      path: string
      tldr?: string
      topics?: string[]
      type?: string
      context_cost?: string
      last_updated?: string
      updated_by?: string
      status?: string
      requires?: string[]
      unlocks?: string[]
    }[] = []

    for (const file of mdFiles) {
      const content = await fs.readFile(path.join(DATA_DIR, file.path), 'utf-8')
      const { frontmatter } = parseFrontmatter(content)

      const metadata: typeof files[0] = { path: file.path }

      if (frontmatter) {
        if (frontmatter.tldr) metadata.tldr = frontmatter.tldr as string
        if (frontmatter.topics) metadata.topics = frontmatter.topics as string[]
        if (frontmatter.type) metadata.type = frontmatter.type as string
        if (frontmatter.context_cost) metadata.context_cost = frontmatter.context_cost as string
        if (frontmatter.last_updated) metadata.last_updated = frontmatter.last_updated as string
        if (frontmatter.updated_by) metadata.updated_by = frontmatter.updated_by as string
        if (frontmatter.status) metadata.status = frontmatter.status as string
        if (frontmatter.requires) metadata.requires = frontmatter.requires as string[]
        if (frontmatter.unlocks) metadata.unlocks = frontmatter.unlocks as string[]
      }

      files.push(metadata)
    }

    res.json({ files, count: files.length })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// GET /api/search - Full-text search with snippets
app.get('/api/search', async (req, res) => {
  try {
    const q = (req.query.q as string || '').toLowerCase().trim()
    if (!q) {
      return res.status(400).json({ error: 'q parameter required' })
    }

    const allFiles = await listFilesRecursive(DATA_DIR)
    const mdFiles = allFiles.filter(f => f.type === 'file' && f.name.endsWith('.md'))

    const results: { path: string, snippet: string, score: number, tldr?: string }[] = []

    for (const file of mdFiles) {
      const content = await fs.readFile(path.join(DATA_DIR, file.path), 'utf-8')
      const { frontmatter, body } = parseFrontmatter(content)
      const lowerContent = content.toLowerCase()

      let score = 0
      let snippet = ''

      // Score based on matches
      const titleMatch = file.name.toLowerCase().includes(q)
      const tldrMatch = frontmatter?.tldr && (frontmatter.tldr as string).toLowerCase().includes(q)
      const topicsMatch = frontmatter?.topics && (frontmatter.topics as string[]).some(t => t.toLowerCase().includes(q))
      const bodyMatch = body.toLowerCase().includes(q)

      if (titleMatch) score += 10
      if (tldrMatch) score += 8
      if (topicsMatch) score += 5
      if (bodyMatch) score += 3

      if (score === 0) continue

      // Extract snippet around first match in body
      const matchIndex = lowerContent.indexOf(q)
      if (matchIndex !== -1) {
        const start = Math.max(0, matchIndex - 50)
        const end = Math.min(content.length, matchIndex + q.length + 100)
        snippet = (start > 0 ? '...' : '') +
          content.slice(start, end).replace(/\s+/g, ' ').trim() +
          (end < content.length ? '...' : '')
      } else if (frontmatter?.tldr) {
        snippet = frontmatter.tldr as string
      }

      results.push({
        path: file.path,
        snippet,
        score,
        ...(frontmatter?.tldr && { tldr: frontmatter.tldr as string })
      })
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score)

    res.json({ query: q, results, count: results.length })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// GET /api/topics - List all unique topics
app.get('/api/topics', async (_req, res) => {
  try {
    const allFiles = await listFilesRecursive(DATA_DIR)
    const mdFiles = allFiles.filter(f => f.type === 'file' && f.name.endsWith('.md'))

    const topicsSet = new Set<string>()

    for (const file of mdFiles) {
      const content = await fs.readFile(path.join(DATA_DIR, file.path), 'utf-8')
      const { frontmatter } = parseFrontmatter(content)

      if (frontmatter?.topics && Array.isArray(frontmatter.topics)) {
        (frontmatter.topics as string[]).forEach(t => topicsSet.add(t.toLowerCase()))
      }
    }

    const topics = Array.from(topicsSet).sort()
    res.json({ topics, count: topics.length })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// GET /api/topics/:topic - Files tagged with a topic
app.get('/api/topics/:topic', async (req, res) => {
  try {
    const topic = req.params.topic.toLowerCase()
    const allFiles = await listFilesRecursive(DATA_DIR)
    const mdFiles = allFiles.filter(f => f.type === 'file' && f.name.endsWith('.md'))

    const files: { path: string, tldr?: string, topics?: string[] }[] = []

    for (const file of mdFiles) {
      const content = await fs.readFile(path.join(DATA_DIR, file.path), 'utf-8')
      const { frontmatter } = parseFrontmatter(content)

      if (frontmatter?.topics && Array.isArray(frontmatter.topics)) {
        const topics = frontmatter.topics as string[]
        if (topics.some(t => t.toLowerCase() === topic)) {
          files.push({
            path: file.path,
            ...(frontmatter.tldr && { tldr: frontmatter.tldr as string }),
            topics
          })
        }
      }
    }

    res.json({ topic, files, count: files.length })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// GET /api/apps - List all registered apps
app.get('/api/apps', async (_req, res) => {
  try {
    const config = await getAppsConfig()
    res.json(config)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// GET /api/apps/:name - Get specific app
app.get('/api/apps/:name', async (req, res) => {
  try {
    const { name } = req.params
    const config = await getAppsConfig()
    const app = config.apps[name]

    if (!app) {
      return res.status(404).json({ error: 'App not found' })
    }

    res.json({ id: name, ...app })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// POST /api/apps/:name - Register or update an app
app.post('/api/apps/:name', async (req, res) => {
  try {
    const { name } = req.params
    const { displayName, github, convex, vercel, url } = req.body

    const config = await getAppsConfig()
    const existing = config.apps[name]

    config.apps[name] = {
      name: displayName || existing?.name || name,
      github: github ?? existing?.github,
      convex: convex ?? existing?.convex,
      vercel: vercel ?? existing?.vercel,
      url: url ?? existing?.url,
      last_checked: existing?.last_checked || today()
    }

    await saveAppsConfig(config)

    res.json({
      success: true,
      action: existing ? 'updated' : 'created',
      app: config.apps[name]
    })
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) })
  }
})

// DELETE /api/apps/:name - Delete an app
app.delete('/api/apps/:name', async (req, res) => {
  try {
    const { name } = req.params
    const config = await getAppsConfig()

    if (!config.apps[name]) {
      return res.status(404).json({ success: false, error: 'App not found' })
    }

    delete config.apps[name]
    await saveAppsConfig(config)

    res.json({ success: true, deleted: name })
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) })
  }
})

// POST /api/apps/:name/checked - Mark app as checked/up-to-date
app.post('/api/apps/:name/checked', async (req, res) => {
  try {
    const { name } = req.params
    const config = await getAppsConfig()

    if (!config.apps[name]) {
      return res.status(404).json({ success: false, error: 'App not found. Register it first.' })
    }

    config.apps[name].last_checked = today()
    await saveAppsConfig(config)

    res.json({
      success: true,
      last_checked: config.apps[name].last_checked
    })
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) })
  }
})

// SPA fallback - serve index.html for all non-API routes
app.get('/{*path}', (_req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'))
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
