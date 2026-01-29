---
last_updated: 2026-01-28
updated_by: vector-projector
change: "Separated concerns: header is navigation, sidebar is app tools, scene toolbar is project controls"
status: tested
---

# Layout

HeroForge-style SPA layout. All apps follow this structure.

## Design Philosophy

- **Single Page App**: All primary interaction on one page
- **Step-based workflow**: Numbered steps (1-6) control panel content
- **Always-visible 3D scene**: Never scrolls, always present
- **Desktop-only**: No mobile, no responsive breakpoints
- **Separation of concerns**: Header for navigation, sidebar for app tools, scene toolbar for project controls

## Layout Zones

```
+-------------+----------------------------+-------+
|    LOGO     |           MENU             | USER  |
|   (w-80)    |   (navigation only)        |(w-40) |
+--+--+--+--+-+---+------------------------+-------+
|1 |2 |3 |4 |5 |6 | New Project | Name | Save     |
+--+--+--+--+-----+----------------------------+---+
|    UPDATES      |                                |
+-----------------+           SCENE                |
|                 |        (flex-1)                |
|     PANEL       |     overflow-hidden            |
|  (overflow-y)   |                                |
|                 |                                |
+-----------------+--------------------------------+
         w-80                  flex-1
```

## Zone Responsibilities

### Header Menu (Navigation)

The header menu is **navigation only**. Links to other pages/views:
- Pricing
- FAQ
- Other informational pages

**Do NOT put** project controls, tools, or actions here.

### Sidebar (App Tools)

The left sidebar contains **app tools**:
- Step numbers (1-6) to switch between tool panels
- Updates section for notifications
- Panel content specific to each step

These are the tools users interact with to build/create.

### Scene Toolbar (Project Controls)

The top of the scene area contains **project controls**:
- New Project - create new project
- Project Name - display/edit current project name
- Save - save current project

These controls manage the project lifecycle, separate from the app tools.

## Structure

### Root Container

```tsx
<div className="h-screen flex flex-col overflow-hidden">
```

Full viewport height, no scrolling at root level.

### Header (h-16)

```tsx
<header className="flex items-center h-16 border-b shrink-0">
  {/* Logo - clicks to home via state */}
  <button
    onClick={() => setCurrentPage('main')}
    className="w-80 h-full flex items-center px-4 bg-sky-500 hover:bg-sky-600"
  >
    App Name
  </button>

  {/* Menu - NAVIGATION ONLY */}
  <div className="flex-1 h-full flex items-center justify-center gap-6 bg-teal-500">
    <button onClick={() => setCurrentPage('pricing')}>Pricing</button>
    <button onClick={() => setCurrentPage('faq')}>FAQ</button>
  </div>

  {/* User - navigates to user page */}
  <div className="w-40 h-full flex shrink-0">
    <button
      onClick={() => setCurrentPage('user')}
      className="w-full h-full flex items-center justify-center bg-orange-400 hover:bg-orange-500"
    >
      User
    </button>
  </div>
</header>
```

### Main Content

```tsx
{currentPage === 'user' ? (
  <UserPage onBack={() => setCurrentPage('main')} />
) : currentPage === 'faq' ? (
  <FaqPage onBack={() => setCurrentPage('main')} />
) : currentPage === 'pricing' ? (
  <PricingPage onBack={() => setCurrentPage('main')} />
) : (
  <div className="flex flex-1 overflow-hidden">
    <aside>...</aside>  {/* Sidebar */}
    <main>...</main>    {/* Scene */}
  </div>
)}
```

### Sidebar (w-80)

```tsx
<aside className="w-80 flex flex-col border-r shrink-0">
  {/* Step buttons - APP TOOLS */}
  <div className="flex shrink-0">
    {[1,2,3,4,5,6].map(step => (
      <button
        key={step}
        className={activeStep === step
          ? 'bg-slate-500 text-white'
          : 'bg-slate-200 hover:bg-slate-300'}
        onClick={() => setActiveStep(step)}
      >
        {step}
      </button>
    ))}
  </div>

  {/* Updates section */}
  <div className="bg-rose-400 px-4 py-2 shrink-0">
    UPDATES
  </div>

  {/* Panel - only scrollable area */}
  <div className="flex-1 overflow-y-auto p-4">
    Panel content for step {activeStep}
  </div>
</aside>
```

### Scene with Toolbar

```tsx
<main className="flex-1 flex flex-col overflow-hidden">
  {/* Project toolbar - PROJECT CONTROLS */}
  <div className="h-10 flex items-center gap-4 px-4 border-b bg-white shrink-0">
    <button className="text-sm text-slate-600 hover:text-slate-900 hover:underline">
      New Project
    </button>
    <span className="text-sm text-slate-400">Project Name</span>
    <button className="text-sm text-slate-600 hover:text-slate-900 hover:underline">
      Save
    </button>
  </div>
  {/* Scene - never scrolls */}
  <div className="flex-1 flex items-center justify-center bg-slate-50 overflow-hidden">
    {/* 3D canvas will go here */}
  </div>
</main>
```

**Critical**: `overflow-hidden` on Scene. It must NEVER scroll.

## State

```tsx
type Page = 'main' | 'user' | 'faq' | 'pricing'

const [activeStep, setActiveStep] = useState(1)
const [currentPage, setCurrentPage] = useState<Page>('main')
```

## Navigation Rules

| Element | Zone | Behavior |
|---------|------|----------|
| Logo | Header | Navigates to main via state |
| Menu items | Header | Navigate to info pages (FAQ, Pricing) |
| User | Header | Navigates to user page |
| Steps | Sidebar | Changes Panel content, stays on page |
| New/Save | Scene Toolbar | Project lifecycle actions |

## Colors (Reference)

Placeholder colors from wireframe. Apps define their own palette.

- Logo area: `bg-sky-500`
- Menu area: `bg-teal-500`
- User area: `bg-orange-400`
- Updates: `bg-rose-400`
- Active step: `bg-slate-500`
- Inactive step: `bg-slate-200`
- Scene toolbar: `bg-white`

## Next Steps

After implementing layout:
1. [viewport-gate.md](viewport-gate.md) - Add desktop enforcement
2. [modals.md](modals.md) - Modal system for user interactions
3. [src-structure.md](src-structure.md) - Organize your /src directory

## Related

- [viewport-gate.md](viewport-gate.md) - Desktop enforcement
- [modals.md](modals.md) - Modal patterns
- [src-structure.md](src-structure.md) - Directory organization
- [../01-setup/stack.md](../01-setup/stack.md) - Project scaffolding
