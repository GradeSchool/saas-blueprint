import { useEffect, useState } from "react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { FileText, FileJson, Settings, ChevronRight, ChevronDown, Folder } from "lucide-react"

const API_BASE = "http://localhost:3001"

interface FileEntry {
  name: string
  path: string
  type: 'file' | 'dir'
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  onFileSelect?: (filepath: string) => void
  onNavigate?: (page: 'config' | 'files') => void
}

export function AppSidebar({ onFileSelect, onNavigate, ...props }: AppSidebarProps) {
  const [files, setFiles] = useState<FileEntry[]>([])
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch(`${API_BASE}/api/files`)
      .then(res => res.json())
      .then(data => setFiles(data.files || []))
      .catch(() => setFiles([]))
  }, [])

  const getIcon = (file: FileEntry) => {
    return file.name.endsWith('.json') ? FileJson : FileText
  }

  const toggleDir = (dir: string) => {
    setExpandedDirs(prev => {
      const next = new Set(prev)
      if (next.has(dir)) {
        next.delete(dir)
      } else {
        next.add(dir)
      }
      return next
    })
  }

  // Group files by directory
  const dirs = files.filter(f => f.type === 'dir')
  const rootFiles = files.filter(f => f.type === 'file' && !f.path.includes('/'))

  const getFilesInDir = (dir: string) => {
    return files.filter(f => f.type === 'file' && f.path.startsWith(dir + '/') && f.path.split('/').length === dir.split('/').length + 1)
  }

  return (
    <Sidebar {...props}>
      <SidebarHeader className="border-b px-4 py-3">
        <span className="font-semibold">SaaS Blueprint</span>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => onNavigate?.('config')}>
                  <Settings />
                  <span>Config</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Data Files</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {rootFiles.map((file) => {
                const Icon = getIcon(file)
                return (
                  <SidebarMenuItem key={file.path}>
                    <SidebarMenuButton onClick={() => onFileSelect?.(file.path)}>
                      <Icon />
                      <span>{file.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}

              {dirs.map((dir) => {
                const isExpanded = expandedDirs.has(dir.path)
                const dirFiles = getFilesInDir(dir.path)
                return (
                  <div key={dir.path}>
                    <SidebarMenuItem>
                      <SidebarMenuButton onClick={() => toggleDir(dir.path)}>
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        <Folder className="h-4 w-4" />
                        <span>{dir.name}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    {isExpanded && dirFiles.map((file) => {
                      const Icon = getIcon(file)
                      return (
                        <SidebarMenuItem key={file.path}>
                          <SidebarMenuButton className="pl-8" onClick={() => onFileSelect?.(file.path)}>
                            <Icon />
                            <span>{file.name}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )
                    })}
                  </div>
                )
              })}

              {files.length === 0 && (
                <SidebarMenuItem>
                  <span className="text-muted-foreground text-sm px-2">No files yet</span>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
