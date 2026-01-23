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
function parseFrontmatter(content: string): { frontmatter: Record<string, string> | null, body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) return { frontmatter: null, body: content }

  const frontmatter: Record<string, string> = {}
  match[1].split('\n').forEach(line => {
    const [key, ...rest] = line.split(':')
    if (key && rest.length) {
      frontmatter[key.trim()] = rest.join(':').trim()
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

      if (frontmatter?.last_updated) {
        const fileDate = new Date(frontmatter.last_updated)
        if (fileDate > sinceDate) {
          changes.push({
            path: file.path,
            last_updated: frontmatter.last_updated,
            updated_by: frontmatter.updated_by || 'unknown',
            change: frontmatter.change || ''
          })
        }
      }
    }

    res.json({ changes })
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
