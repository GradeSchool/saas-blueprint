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
      { method: 'GET', path: '/api/recipe', description: 'System overview and guide' },
      { method: 'GET', path: '/api/files', description: 'List all data files' },
      { method: 'GET', path: '/api/files/{path}', description: 'Get a specific file or directory' },
      { method: 'POST', path: '/api/recipes/{name}', description: 'Create or update a recipe' }
    ]
  })
})

app.get('/api/recipe', async (_req, res) => {
  try {
    const content = await fs.readFile(path.join(DATA_DIR, 'recipe.md'), 'utf-8')
    res.type('text/markdown').send(content)
  } catch {
    res.status(404).send('Recipe not found')
  }
})

const DATA_DIR = path.join(__dirname, '../data')

app.post('/api/test-write', async (_req, res) => {
  try {
    const data = { message: 'Hello World', timestamp: new Date().toISOString() }
    await fs.writeFile(path.join(DATA_DIR, 'hello.json'), JSON.stringify(data, null, 2))
    res.json({ success: true, file: 'data/hello.json' })
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) })
  }
})

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

const RECIPES_DIR = path.join(DATA_DIR, 'recipes')

app.post('/api/recipes/:name', async (req, res) => {
  try {
    const { name } = req.params
    const { content, source } = req.body

    if (!content) {
      return res.status(400).json({ success: false, error: 'content is required' })
    }

    // Ensure recipes directory exists
    await fs.mkdir(RECIPES_DIR, { recursive: true })

    const filePath = path.join(RECIPES_DIR, `${name}.md`)

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
      path: `recipes/${name}.md`,
      source: source || 'unknown'
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
