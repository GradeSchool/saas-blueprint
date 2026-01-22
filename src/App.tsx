import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"

function App() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b px-4">
          <SidebarTrigger />
          <h1 className="text-lg font-semibold">Hello World</h1>
        </header>
        <main className="flex-1 p-6">
          <div className="rounded-lg border p-4">
            <h2 className="text-xl font-semibold mb-2">Welcome to SaaS Blueprint</h2>
            <p className="text-muted-foreground">
              AI-readable knowledge repository for building SaaS products.
            </p>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default App
