import { useState } from "react"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"

const API_BASE = "http://localhost:3001"

type Page = 'home' | 'config' | 'file'

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home')
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<string | null>(null)

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
            <div className="rounded-lg border p-4">
              <h2 className="text-xl font-semibold mb-4">Participating Apps</h2>
              <p className="text-muted-foreground mb-4">
                Manage the apps that sync with this blueprint. Each app tracks which recipe versions it has applied.
              </p>
              <div className="border rounded-lg p-4 bg-muted/50">
                <p className="text-sm text-muted-foreground">No apps configured yet.</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Apps will appear here with their name, links (Convex, Vercel, etc.), and last sync timestamp.
                </p>
              </div>
            </div>
          )}

          {currentPage === 'file' && selectedFile && (
            <pre className="rounded-lg border p-4 bg-muted/50 overflow-auto text-sm">
              {fileContent}
            </pre>
          )}

          {currentPage === 'home' && (
            <div className="rounded-lg border p-4">
              <h2 className="text-xl font-semibold mb-2">Welcome to SaaS Blueprint</h2>
              <p className="text-muted-foreground">
                Select a file from the sidebar to view its contents, or visit Config to manage participating apps.
              </p>
            </div>
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default App
