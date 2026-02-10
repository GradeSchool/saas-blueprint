import { useState, useEffect, useCallback } from "react"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { ChevronRight, Home, Copy, Check } from "lucide-react"

const API_BASE = "http://localhost:3001"

type Page = 'home' | 'config' | 'file'

// Parse hash into route state
function parseHash(hash: string): { page: Page; file: string | null } {
  const cleaned = hash.replace(/^#\/?/, '')
  if (!cleaned || cleaned === '') return { page: 'home', file: null }
  if (cleaned === 'config') return { page: 'config', file: null }
  if (cleaned.startsWith('file/')) {
    return { page: 'file', file: cleaned.slice(5) }
  }
  return { page: 'home', file: null }
}

// Build hash from route state
function buildHash(page: Page, file: string | null): string {
  if (page === 'config') return '#/config'
  if (page === 'file' && file) return `#/file/${file}`
  return '#/'
}

interface AppInfo {
  name: string
  github?: string
  convex?: string
  vercel?: string
  url?: string
  last_checked: string
}

interface AppWithChanges extends AppInfo {
  id: string
  changesCount: number
}

function App() {
  // Initialize from hash
  const initialRoute = parseHash(window.location.hash)
  const [currentPage, setCurrentPage] = useState<Page>(initialRoute.page)
  const [selectedFile, setSelectedFile] = useState<string | null>(initialRoute.file)
  const [fileContent, setFileContent] = useState<string | null>(null)
  const [apps, setApps] = useState<AppWithChanges[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    id: '',
    displayName: '',
    github: '',
    convex: '',
    vercel: '',
    url: ''
  })
  const [copied, setCopied] = useState(false)

  const copyFileUrl = useCallback(() => {
    if (selectedFile) {
      const url = `curl http://localhost:3001/api/files/${selectedFile}`
      navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [selectedFile])

  // Sync URL hash with state
  const navigate = useCallback((page: Page, file: string | null = null) => {
    setCurrentPage(page)
    setSelectedFile(file)
    const newHash = buildHash(page, file)
    if (window.location.hash !== newHash) {
      window.location.hash = newHash
    }
  }, [])

  // Listen for browser back/forward
  useEffect(() => {
    const handleHashChange = () => {
      const route = parseHash(window.location.hash)
      setCurrentPage(route.page)
      setSelectedFile(route.file)
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const loadApps = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/apps`)
      const data = await res.json()

      const appsWithChanges: AppWithChanges[] = []

      for (const [id, app] of Object.entries(data.apps) as [string, AppInfo][]) {
        const changesRes = await fetch(`${API_BASE}/api/changes?since=${app.last_checked}`)
        const changesData = await changesRes.json()

        appsWithChanges.push({
          id,
          ...app,
          changesCount: changesData.changes?.length || 0
        })
      }

      setApps(appsWithChanges)
    } catch (err) {
      console.error('Failed to load apps:', err)
    } finally {
      setLoading(false)
    }
  }

  const markChecked = async (appId: string) => {
    try {
      await fetch(`${API_BASE}/api/apps/${appId}/checked`, { method: 'POST' })
      loadApps()
    } catch (err) {
      console.error('Failed to mark checked:', err)
    }
  }

  const deleteApp = async (appId: string) => {
    if (!confirm(`Delete "${appId}"?`)) return
    try {
      await fetch(`${API_BASE}/api/apps/${appId}`, { method: 'DELETE' })
      loadApps()
    } catch (err) {
      console.error('Failed to delete app:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.id.trim()) return

    try {
      await fetch(`${API_BASE}/api/apps/${formData.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: formData.displayName || formData.id,
          github: formData.github || undefined,
          convex: formData.convex || undefined,
          vercel: formData.vercel || undefined,
          url: formData.url || undefined
        })
      })
      setFormData({ id: '', displayName: '', github: '', convex: '', vercel: '', url: '' })
      setShowForm(false)
      loadApps()
    } catch (err) {
      console.error('Failed to add app:', err)
    }
  }

  useEffect(() => {
    if (currentPage === 'config') {
      loadApps()
    }
  }, [currentPage])

  const handleFileSelect = useCallback((filename: string) => {
    navigate('file', filename)
  }, [navigate])

  // Load file content when selectedFile changes
  useEffect(() => {
    if (currentPage === 'file' && selectedFile) {
      setFileContent(null) // Clear while loading
      fetch(`${API_BASE}/api/files/${selectedFile}`)
        .then(res => {
          if (selectedFile.endsWith('.json')) {
            return res.json().then(data => JSON.stringify(data, null, 2))
          }
          return res.text()
        })
        .then(setFileContent)
        .catch(() => setFileContent('Error loading file'))
    }
  }, [currentPage, selectedFile])

  const handleNavigate = useCallback((page: 'config' | 'files') => {
    if (page === 'config') {
      navigate('config')
    } else {
      navigate('home')
    }
  }, [navigate])

  // Build breadcrumbs from path
  const getBreadcrumbs = () => {
    if (currentPage === 'config') return [{ label: 'Config', path: null }]
    if (currentPage === 'file' && selectedFile) {
      const parts = selectedFile.split('/')
      return parts.map((part, i) => ({
        label: part,
        path: i < parts.length - 1 ? parts.slice(0, i + 1).join('/') : null
      }))
    }
    return []
  }

  const AppLinks = ({ app }: { app: AppWithChanges }) => {
    const links = [
      { url: app.url, label: 'App' },
      { url: app.github, label: 'GitHub' },
      { url: app.convex, label: 'Convex' },
      { url: app.vercel, label: 'Vercel' }
    ].filter(l => l.url)

    if (links.length === 0) return null

    return (
      <div className="flex gap-2 mt-1">
        {links.map(link => (
          <a
            key={link.label}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-500 hover:underline"
          >
            {link.label}
          </a>
        ))}
      </div>
    )
  }

  const breadcrumbs = getBreadcrumbs()

  return (
    <SidebarProvider>
      <AppSidebar
        onFileSelect={handleFileSelect}
        onNavigate={handleNavigate}
        selectedFile={selectedFile}
      />
      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <button
            onClick={() => navigate('home')}
            className="p-1 hover:bg-accent rounded transition-colors"
            title="Home"
          >
            <Home className="h-4 w-4" />
          </button>
          {breadcrumbs.length > 0 && (
            <>
              <nav className="flex items-center gap-1 text-sm">
                {breadcrumbs.map((crumb, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    {crumb.path ? (
                      <span className="text-muted-foreground">{crumb.label}</span>
                    ) : (
                      <span className="font-medium">{crumb.label}</span>
                    )}
                  </div>
                ))}
              </nav>
              {currentPage === 'file' && selectedFile && (
                <button
                  onClick={copyFileUrl}
                  className="ml-auto flex items-center gap-1.5 px-2 py-1 text-xs font-mono bg-muted hover:bg-accent rounded border transition-colors"
                  title="Copy curl command for this file"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 text-green-600" />
                      <span className="text-green-600">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span className="text-muted-foreground">curl .../api/files/{selectedFile.split('/').pop()}</span>
                    </>
                  )}
                </button>
              )}
            </>
          )}
          {breadcrumbs.length === 0 && currentPage === 'home' && (
            <span className="text-lg font-semibold">SaaS Blueprint</span>
          )}
        </header>
        <main className="flex-1 p-6">
          {currentPage === 'config' && (
            <div className="space-y-6">
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Registered Apps</h2>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)}>
                      {showForm ? 'Cancel' : 'Add App'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={loadApps} disabled={loading}>
                      {loading ? 'Loading...' : 'Refresh'}
                    </Button>
                  </div>
                </div>

                {showForm && (
                  <form onSubmit={handleSubmit} className="border rounded-lg p-4 mb-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium">App ID *</label>
                        <Input
                          placeholder="my-app"
                          value={formData.id}
                          onChange={e => setFormData({ ...formData, id: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Display Name</label>
                        <Input
                          placeholder="My App"
                          value={formData.displayName}
                          onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">GitHub URL</label>
                        <Input
                          placeholder="https://github.com/..."
                          value={formData.github}
                          onChange={e => setFormData({ ...formData, github: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Convex URL</label>
                        <Input
                          placeholder="https://dashboard.convex.dev/..."
                          value={formData.convex}
                          onChange={e => setFormData({ ...formData, convex: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Vercel URL</label>
                        <Input
                          placeholder="https://vercel.com/..."
                          value={formData.vercel}
                          onChange={e => setFormData({ ...formData, vercel: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">App URL</label>
                        <Input
                          placeholder="https://myapp.com"
                          value={formData.url}
                          onChange={e => setFormData({ ...formData, url: e.target.value })}
                        />
                      </div>
                    </div>
                    <Button type="submit" size="sm">Add App</Button>
                  </form>
                )}

                <p className="text-muted-foreground mb-4">
                  Apps that sync with this blueprint. Shows files changed since each app last checked.
                </p>

                {apps.length === 0 && !showForm ? (
                  <div className="border rounded-lg p-4 bg-muted/50">
                    <p className="text-sm text-muted-foreground">
                      No apps registered yet. Click "Add App" to register your first app.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {apps.map(app => (
                      <div key={app.id} className="border rounded-lg p-4 flex items-center justify-between">
                        <div>
                          <div className="font-medium">{app.name}</div>
                          <div className="text-sm text-muted-foreground">
                            Last checked: {app.last_checked}
                          </div>
                          <AppLinks app={app} />
                        </div>
                        <div className="flex items-center gap-3">
                          {app.changesCount > 0 ? (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-sm font-medium">
                              {app.changesCount} file{app.changesCount > 1 ? 's' : ''} changed
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm font-medium">
                              Up to date
                            </span>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => markChecked(app.id)}
                          >
                            Mark Checked
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteApp(app.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-lg border p-4">
                <h3 className="font-semibold mb-2">How It Works</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Agents update docs with timestamps in frontmatter</li>
                  <li>• Each app tracks when it last reviewed the blueprint</li>
                  <li>• Yellow badge = files changed since last check</li>
                  <li>• Click "Mark Checked" after reviewing/applying changes</li>
                </ul>
              </div>
            </div>
          )}

          {currentPage === 'file' && selectedFile && (
            selectedFile.endsWith('.md') ? (
              (() => {
                const content = (fileContent || '').replace(/\r\n/g, '\n')
                const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/)
                const frontmatter = frontmatterMatch ? frontmatterMatch[1] : null
                const markdown = frontmatterMatch ? content.slice(frontmatterMatch[0].length) : content

                return (
                  <div className="space-y-4">
                    {frontmatter && (
                      <div className="rounded-lg border bg-muted/50 p-4 font-mono text-xs space-y-1">
                        {frontmatter.split('\n').map((line, i) => {
                          const [key, ...rest] = line.split(':')
                          const value = rest.join(':').trim().replace(/^["']|["']$/g, '')
                          return (
                            <div key={i}>
                              <span className="text-muted-foreground">{key}:</span>{' '}
                              <code className="bg-background px-1.5 py-0.5 rounded">{value}</code>
                            </div>
                          )
                        })}
                      </div>
                    )}
                    <div className="rounded-lg border p-6 prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
                    </div>
                  </div>
                )
              })()
            ) : (
              <pre className="rounded-lg border p-4 bg-muted/50 overflow-auto text-sm">
                {fileContent}
              </pre>
            )
          )}

          {currentPage === 'home' && (
            <div className="space-y-6">
              <div className="rounded-lg border p-4">
                <h2 className="text-xl font-semibold mb-2">Welcome to SaaS Blueprint</h2>
                <p className="text-muted-foreground">
                  Select a file from the sidebar to view its contents, or visit Config to manage participating apps.
                </p>
              </div>

              <div className="rounded-lg border p-4 bg-muted/50">
                <h3 className="font-semibold mb-3">Agent API Reference</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Find answers fast without filling context. Click any endpoint to copy the curl command.
                </p>

                <div className="space-y-4 text-sm font-mono">
                  {/* Discovery */}
                  <div>
                    <div className="text-xs uppercase text-muted-foreground mb-2 font-sans font-medium tracking-wide">Discovery</div>
                    <div className="space-y-2">
                      {[
                        { path: "/api/index", desc: "Root index - start here" },
                        { path: "/api/metadata", desc: "All file metadata in one call" },
                        { path: "/api/endpoints", desc: "List all endpoints" },
                      ].map(({ path, desc }) => (
                        <div key={path} className="flex items-center gap-3">
                          <code
                            className="bg-background px-2 py-1 rounded border cursor-pointer hover:bg-accent transition-colors"
                            onClick={() => navigator.clipboard.writeText(`curl http://localhost:3001${path}`)}
                            title="Click to copy"
                          >
                            GET {path}
                          </code>
                          <span className="text-muted-foreground font-sans text-xs">{desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Search */}
                  <div>
                    <div className="text-xs uppercase text-muted-foreground mb-2 font-sans font-medium tracking-wide">Search</div>
                    <div className="space-y-2">
                      {[
                        { path: "/api/search?q=auth", desc: "Full-text search with snippets" },
                      ].map(({ path, desc }) => (
                        <div key={path} className="flex items-center gap-3">
                          <code
                            className="bg-background px-2 py-1 rounded border cursor-pointer hover:bg-accent transition-colors"
                            onClick={() => navigator.clipboard.writeText(`curl "http://localhost:3001${path}"`)}
                            title="Click to copy"
                          >
                            GET {path}
                          </code>
                          <span className="text-muted-foreground font-sans text-xs">{desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Topics */}
                  <div>
                    <div className="text-xs uppercase text-muted-foreground mb-2 font-sans font-medium tracking-wide">Topics</div>
                    <div className="space-y-2">
                      {[
                        { path: "/api/topics", desc: "List all unique topics" },
                        { path: "/api/topics/auth", desc: "Files tagged with a topic" },
                      ].map(({ path, desc }) => (
                        <div key={path} className="flex items-center gap-3">
                          <code
                            className="bg-background px-2 py-1 rounded border cursor-pointer hover:bg-accent transition-colors"
                            onClick={() => navigator.clipboard.writeText(`curl http://localhost:3001${path}`)}
                            title="Click to copy"
                          >
                            GET {path}
                          </code>
                          <span className="text-muted-foreground font-sans text-xs">{desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Files */}
                  <div>
                    <div className="text-xs uppercase text-muted-foreground mb-2 font-sans font-medium tracking-wide">Files</div>
                    <div className="space-y-2">
                      {[
                        { path: "/api/files", desc: "List all files" },
                        { path: "/api/files/core/04-auth/setup.md", desc: "Get specific file content" },
                        { path: "/api/changes?since=2026-01-01", desc: "Files updated since date" },
                      ].map(({ path, desc }) => (
                        <div key={path} className="flex items-center gap-3">
                          <code
                            className="bg-background px-2 py-1 rounded border cursor-pointer hover:bg-accent transition-colors"
                            onClick={() => navigator.clipboard.writeText(`curl "http://localhost:3001${path}"`)}
                            title="Click to copy"
                          >
                            GET {path}
                          </code>
                          <span className="text-muted-foreground font-sans text-xs">{desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <div className="text-sm font-medium mb-2">Base URL</div>
                  <code
                    className="text-sm bg-background px-2 py-1 rounded border cursor-pointer hover:bg-accent transition-colors inline-block"
                    onClick={() => navigator.clipboard.writeText("http://localhost:3001")}
                    title="Click to copy"
                  >
                    http://localhost:3001
                  </code>
                </div>
              </div>
            </div>
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default App
