---
last_updated: 2026-01-23
updated_by: saas-blueprint
change: "Initial explicit save pattern"
---

# Save Pattern

Explicit save with visual feedback. No auto-save.

## State

```tsx
const [project, setProject] = useState<Project>(initialProject)
const [isDirty, setIsDirty] = useState(false)
const saveProject = useMutation(api.projects.save)

const handleSave = async () => {
  await saveProject({ data: project })
  setIsDirty(false)
}
```

## Save Button

Prominent button that pulses when dirty:

```tsx
<Button
  onClick={handleSave}
  variant={isDirty ? "destructive" : "outline"}
  className={isDirty ? "animate-pulse" : ""}
>
  {isDirty ? "Save Your Work!" : "Saved"}
</Button>
```

## Warn on Close

```tsx
useEffect(() => {
  const handler = (e: BeforeUnloadEvent) => {
    if (isDirty) {
      e.preventDefault()
      e.returnValue = ''
    }
  }
  window.addEventListener('beforeunload', handler)
  return () => window.removeEventListener('beforeunload', handler)
}, [isDirty])
```

## Rationale

- Auto-save interrupts flow
- Users learn to save (big visible button trains the habit)
- Crash = lost work is acceptable for the simplicity gained
