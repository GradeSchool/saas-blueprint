import express from 'express'
import cors from 'cors'
import path from 'path'
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

// SPA fallback - serve index.html for all non-API routes
app.get('/{*path}', (_req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'))
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
