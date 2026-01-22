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
      { method: 'POST', path: '/api/test-write', description: 'Write a test JSON file' }
    ]
  })
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

// SPA fallback - serve index.html for all non-API routes
app.get('/{*path}', (_req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'))
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
