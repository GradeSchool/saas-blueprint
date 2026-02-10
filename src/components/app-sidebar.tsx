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
  selectedFile?: string | null
}

function DirTree({
  dir,
  depth,
  expandedDirs,
  toggleDir,
  getChildDirs,
  getFilesInDir,
  getIcon,
  onFileSelect,
  selectedFile,
}: {
  dir: FileEntry
  depth: number
  expandedDirs: Set<string>
  toggleDir: (dir: string) => void
  getChildDirs: (path: string) => FileEntry[]
  getFilesInDir: (path: string) => FileEntry[]
  getIcon: (file: FileEntry) => typeof FileText
  onFileSelect?: (filepath: string) => void
  selectedFile?: string | null
}) {
  const isExpanded = expandedDirs.has(dir.path)
  const childDirs = getChildDirs(dir.path)
  const dirFiles = getFilesInDir(dir.path)
  const paddingLeft = depth * 16

  return (
    <div>
      <SidebarMenuItem>
        <SidebarMenuButton style={{ paddingLeft: `${paddingLeft + 8}px` }} onClick={() => toggleDir(dir.path)}>
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <Folder className="h-4 w-4" />
          <span>{dir.name}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      {isExpanded && (
        <>
          {childDirs.map((childDir) => (
            <DirTree
              key={childDir.path}
              dir={childDir}
              depth={depth + 1}
              expandedDirs={expandedDirs}
              toggleDir={toggleDir}
              getChildDirs={getChildDirs}
              getFilesInDir={getFilesInDir}
              getIcon={getIcon}
              onFileSelect={onFileSelect}
              selectedFile={selectedFile}
            />
          ))}
          {dirFiles.map((file) => {
            const Icon = getIcon(file)
            const isSelected = file.path === selectedFile
            return (
              <SidebarMenuItem key={file.path}>
                <SidebarMenuButton
                  style={{ paddingLeft: `${paddingLeft + 24}px` }}
                  onClick={() => onFileSelect?.(file.path)}
                  isActive={isSelected}
                  className={isSelected ? "bg-accent font-medium" : ""}
                >
                  <Icon className={isSelected ? "text-primary" : ""} />
                  <span>{file.name}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </>
      )}
    </div>
  )
}

export function AppSidebar({ onFileSelect, onNavigate, selectedFile, ...props }: AppSidebarProps) {
  const [files, setFiles] = useState<FileEntry[]>([])
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch(`${API_BASE}/api/files`)
      .then(res => res.json())
      .then(data => setFiles(data.files || []))
      .catch(() => setFiles([]))
  }, [])

  // Auto-expand to show selected file
  useEffect(() => {
    if (selectedFile) {
      const parts = selectedFile.split('/')
      const parentPaths: string[] = []
      for (let i = 0; i < parts.length - 1; i++) {
        parentPaths.push(parts.slice(0, i + 1).join('/'))
      }
      if (parentPaths.length > 0) {
        setExpandedDirs(prev => {
          const next = new Set(prev)
          parentPaths.forEach(p => next.add(p))
          return next
        })
      }
    }
  }, [selectedFile])

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
  const rootDirs = files.filter(f => f.type === 'dir' && !f.path.includes('/'))
  const rootFiles = files.filter(f => f.type === 'file' && !f.path.includes('/'))

  const getChildDirs = (parentPath: string) => {
    return files.filter(f =>
      f.type === 'dir' &&
      f.path.startsWith(parentPath + '/') &&
      f.path.split('/').length === parentPath.split('/').length + 1
    )
  }

  const getFilesInDir = (dir: string) => {
    return files.filter(f => f.type === 'file' && f.path.startsWith(dir + '/') && f.path.split('/').length === dir.split('/').length + 1)
  }

  return (
    <Sidebar {...props}>
      <SidebarHeader className="border-b px-4 py-3">
        <button
          onClick={() => onNavigate?.('files')}
          className="font-semibold hover:text-primary transition-colors text-left"
        >
          Weheart.art SaaS Blueprint
        </button>
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
                const isSelected = file.path === selectedFile
                return (
                  <SidebarMenuItem key={file.path}>
                    <SidebarMenuButton
                      onClick={() => onFileSelect?.(file.path)}
                      isActive={isSelected}
                      className={isSelected ? "bg-accent font-medium" : ""}
                    >
                      <Icon className={isSelected ? "text-primary" : ""} />
                      <span>{file.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}

              {rootDirs.map((dir) => (
                <DirTree
                  key={dir.path}
                  dir={dir}
                  depth={0}
                  expandedDirs={expandedDirs}
                  toggleDir={toggleDir}
                  getChildDirs={getChildDirs}
                  getFilesInDir={getFilesInDir}
                  getIcon={getIcon}
                  onFileSelect={onFileSelect}
                  selectedFile={selectedFile}
                />
              ))}

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
