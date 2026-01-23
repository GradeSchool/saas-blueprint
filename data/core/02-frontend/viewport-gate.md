---
last_updated: 2026-01-23
updated_by: saas-blueprint
change: "Initial viewport gate pattern"
---

# Viewport Gate

Enforce desktop-only (1024x768 minimum).

## Implementation

```tsx
const MIN_WIDTH = 1024
const MIN_HEIGHT = 768

function App() {
  const [tooSmall, setTooSmall] = useState(false)

  useEffect(() => {
    const check = () => setTooSmall(
      window.innerWidth < MIN_WIDTH || window.innerHeight < MIN_HEIGHT
    )
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  if (tooSmall) {
    return (
      <div className="flex h-screen items-center justify-center p-8 text-center">
        <div>
          <h1 className="text-xl font-semibold mb-2">Desktop Required</h1>
          <p className="text-muted-foreground">
            This app requires a screen at least {MIN_WIDTH}x{MIN_HEIGHT} pixels.
          </p>
        </div>
      </div>
    )
  }

  return <ActualApp />
}
```

## Rationale

- Users don't do precision graphics work on phones
- Removes: responsive layouts, touch events, mobile Safari bugs
- Adds: one simple viewport check
