import { useState, useEffect } from "react"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

const API_BASE = "http://localhost:3001"

type Page = 'home' | 'config' | 'file'

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
  const [currentPage, setCurrentPage] = useState<Page>('home')
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
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

  const handleFileSelect = async (filename: string) => {
    setSelectedFile(filename)
    setCurrentPage('file')
    try {
      const res = await fetch(`${API_BASE}/api/files/${filename}`)
      if (filename.endsWith('.json')) {
        const data = await res.json()
        setFileContent(JSON.stringify(data, null, 2))
      } else {
        const text = await res.text()
        setFileContent(text)
      }
    } catch {
      setFileContent('Error loading file')
    }
  }

  const handleNavigate = (page: 'config' | 'files') => {
    if (page === 'config') {
      setCurrentPage('config')
      setSelectedFile(null)
    } else {
      setCurrentPage('home')
      setSelectedFile(null)
    }
  }

  const getTitle = () => {
    if (currentPage === 'config') return 'Config'
    if (currentPage === 'file' && selectedFile) return selectedFile
    return 'SaaS Blueprint'
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

  return (
    <SidebarProvider>
      <AppSidebar onFileSelect={handleFileSelect} onNavigate={handleNavigate} />
      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b px-4">
          <SidebarTrigger />
          <h1 className="text-lg font-semibold">{getTitle()}</h1>
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
                <h3 className="font-semibold mb-3">🤖 AI Agent Quick Start</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Connect to this blueprint API to fetch patterns for your SaaS app. Click to copy curl command.
                </p>

                <div className="space-y-3 text-sm font-mono">
                  {[
                    { comment: "# Start here - get the index", path: "/api/index" },
                    { comment: "# List all available files", path: "/api/files" },
                    { comment: "# Get a specific file or directory", path: "/api/files/core/02-frontend/save-pattern.md" },
                  ].map(({ comment, path }) => (
                    <div key={path}>
                      <div className="text-muted-foreground mb-1">{comment}</div>
                      <code
                        className="bg-background px-2 py-1 rounded border cursor-pointer hover:bg-accent transition-colors inline-block"
                        onClick={() => {
                          navigator.clipboard.writeText(`curl http://localhost:3001${path}`)
                        }}
                        title="Click to copy curl command"
                      >
                        GET {path}
                      </code>
                    </div>
                  ))}
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
