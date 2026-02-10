---
last_updated: 2026-01-27
updated_by: vector-projector
change: "Added onboarding modal pattern"
status: tested
tldr: "Modal system with auth, onboarding, and generic patterns. URL-driven state."
topics: [frontend, modals, ui, react, patterns]
---

# Modals

Modal system for user interactions.

## Architecture

```
/src/components
  Modal.tsx              <- Base modal shell (reusable)
  /modals
    AuthModal.tsx        <- Sign in/up with verification
    OnboardingModal.tsx  <- First-visit welcome modal
    TestModal.tsx        <- Example modal
    ConfirmModal.tsx     <- Confirmation dialogs
```

## Base Modal Component

```tsx
// src/components/Modal.tsx
import { useEffect } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">
            &times;
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}
```

## Onboarding Modal Pattern

First-visit welcome modal. Shows once per browser (localStorage).

### Why localStorage?

User has no account yet. Can't store "seen" flag in database.

### Implementation

```tsx
// App.tsx - State and localStorage check
const ONBOARDING_KEY = 'vp_onboarding_seen'
const [isOnboardingOpen, setIsOnboardingOpen] = useState(false)

useEffect(() => {
  const seen = localStorage.getItem(ONBOARDING_KEY)
  if (!seen) setIsOnboardingOpen(true)
}, [])

const handleOnboardingClose = () => {
  localStorage.setItem(ONBOARDING_KEY, 'true')
  setIsOnboardingOpen(false)
}
```

```tsx
// OnboardingModal.tsx
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Modal } from '@/components/Modal'

export function OnboardingModal({ isOpen, onClose, onGoToFaq }) {
  const appState = useQuery(api.appState.get)
  const crowdfundingActive = appState?.crowdfundingActive ?? false

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Welcome to App Name">
      <div className="space-y-4">
        {crowdfundingActive ? (
          <>
            <p>We're currently in <strong>Crowdfunding Early Access</strong>.</p>
            <p>Backers can unlock full features...</p>
          </>
        ) : (
          <>
            <p>A tool for [description].</p>
            <p>Explore the demo, sign up to save your work...</p>
          </>
        )}
        <div className="flex gap-3">
          <button onClick={() => { onClose(); onGoToFaq(); }}>Learn More</button>
          <button onClick={onClose}>Just Explore</button>
        </div>
      </div>
    </Modal>
  )
}
```

### Key Points

- **localStorage key**: Use app-specific prefix (e.g., `vp_onboarding_seen`)
- **Close = seen**: Any close action marks as seen
- **Crowdfunding toggle**: Content changes based on `app_state.crowdfundingActive`
- **FAQ navigation**: Modal can trigger page navigation before closing

## Auth Modal Pattern

Two-step: credentials → verification code.

```tsx
const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup' | null>(null)

<AuthModal
  isOpen={authModalMode !== null}
  onClose={() => setAuthModalMode(null)}
  mode={authModalMode ?? 'signin'}
/>
```

See `AuthModal.tsx` for full implementation with OTP verification.

## Related

- [layout.md](layout.md) - Overall app layout
- [src-structure.md](src-structure.md) - Directory organization
- [../03-convex/schema.md](../03-convex/schema.md) - app_state singleton