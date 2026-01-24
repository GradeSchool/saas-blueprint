---
last_updated: 2026-01-23
updated_by: vector-projector
change: "Updated dimensions to w-80/h-16, fixed navigation description"
status: tested
---

# Layout

HeroForge-style SPA layout. All apps follow this structure.

## Design Philosophy

- **Single Page App**: All primary interaction on one page
- **Step-based workflow**: Numbered steps (1-6) control panel content
- **Always-visible 3D scene**: Never scrolls, always present
- **Desktop-only**: No mobile, no responsive breakpoints

## Layout Zones

```
+-------------+----------------------------+-------+
|    LOGO     |           MENU             | USER  |
|   (w-80)    |    (flex-1, centered)      |(w-20) |
+--+--+--+--+-+----------------------------+-------+
|1 |2 |3 |4 |5 |6 |                                |
+--+--+--+--+-----+                                |
|    UPDATES      |                                |
+-----------------+           SCENE                |
|                 |        (flex-1)                |
|     PANEL       |     overflow-hidden            |
|  (overflow-y)   |                                |
|                 |                                |
+-----------------+--------------------------------+
         w-80                  flex-1
```

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

  {/* Menu - fills center */}
  <div className="flex-1 h-full flex items-center justify-center gap-6 bg-teal-500">
    <button>Pricing</button>
    <button>FAQ</button>
    <button>New Project</button>
    <span>Project Name</span>
    <button>Save</button>
  </div>

  {/* User - navigates to user page */}
  <button
    onClick={() => setCurrentPage('user')}
    className="w-20 h-full flex items-center justify-center bg-orange-400 hover:bg-orange-500"
  >
    User
  </button>
</header>
```

### Main Content

```tsx
{currentPage === 'user' ? (
  <UserPage onBack={() => setCurrentPage('main')} />
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
  {/* Step buttons */}
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

### Scene

```tsx
<main className="flex-1 flex items-center justify-center bg-slate-50 overflow-hidden">
  {/* 3D canvas will go here */}
</main>
```

**Critical**: `overflow-hidden` on Scene. It must NEVER scroll.

## State

```tsx
type Page = 'main' | 'user'

const [activeStep, setActiveStep] = useState(1)
const [currentPage, setCurrentPage] = useState<Page>('main')
```

## Navigation Rules

| Element | Behavior |
|---------|----------|
| Logo | Navigates to main via state (no page reload) |
| Menu items | In-app actions (modals, state changes) |
| User | Navigates to user page via state |
| Steps | Changes Panel content, stays on page |

## Colors (Reference)

Placeholder colors from wireframe. Apps define their own palette.

- Logo area: `bg-sky-500`
- Menu area: `bg-teal-500`
- User area: `bg-orange-400`
- Updates: `bg-rose-400`
- Active step: `bg-slate-500`
- Inactive step: `bg-slate-200`

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