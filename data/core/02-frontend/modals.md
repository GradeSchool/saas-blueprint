---
last_updated: 2026-01-24
updated_by: vector-projector
change: "Updated AuthModal with verification flow"
status: tested
---

# Modals

Modal system for user interactions. These apps use many modals.

## Architecture

```
/src/components
  Modal.tsx              <- Base modal shell (reusable)
  /modals
    AuthModal.tsx        <- Sign in/up modal with verification
    TestModal.tsx        <- Example modal
    ConfirmModal.tsx     <- Confirmation dialogs
    etc.
```

## Base Modal Component

The base `Modal.tsx` handles:
- Backdrop with click-to-close
- Escape key to close
- Body scroll lock when open
- Title and close button
- Children slot for content

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
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  )
}
```

## Auth Modal Pattern

Two-step modal: credentials → verification code.

### Header Integration

```tsx
// App.tsx
const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup' | null>(null)

// When signed out, show two buttons:
<button onClick={() => setAuthModalMode('signup')}>Sign Up</button>
<button onClick={() => setAuthModalMode('signin')}>Sign In</button>

// When signed in, show one button:
<button onClick={() => setCurrentPage('user')}>User</button>

// Modal:
<AuthModal
  isOpen={authModalMode !== null}
  onClose={() => setAuthModalMode(null)}
  mode={authModalMode ?? 'signin'}
/>
```

### AuthModal Implementation

```tsx
type Step = 'form' | 'verify'

export function AuthModal({ isOpen, onClose, mode }: AuthModalProps) {
  const [step, setStep] = useState<Step>('form')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  // ... other state

  // Reset on open/mode change
  useEffect(() => {
    if (isOpen) {
      setStep('form')
      setEmail('')
      setCode('')
      // ... reset other fields
    }
  }, [isOpen, mode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === 'signup') {
      const result = await authClient.signUp.email({ email, password, name })
      if (result.error) {
        setError(result.error.message)
        return
      }
      setStep('verify') // Switch to verification
    } else {
      const result = await authClient.signIn.email({ email, password })
      if (result.error) {
        setError(result.error.message)
        return
      }
      onClose()
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = await authClient.emailOtp.verifyEmail({ email, otp: code })
    if (result.error) {
      setError(result.error.message)
      return
    }
    onClose()
  }

  const handleResend = async () => {
    await authClient.emailOtp.sendVerificationOtp({ email, type: 'email-verification' })
  }

  // Render verification step
  if (step === 'verify') {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Verify your email">
        <form onSubmit={handleVerify}>
          <p>We sent a code to {email}</p>
          <input value={code} onChange={...} maxLength={6} />
          <button type="submit">Verify</button>
          <button type="button" onClick={handleResend}>Resend code</button>
        </form>
      </Modal>
    )
  }

  // Render signin/signup form
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={mode === 'signin' ? 'Sign In' : 'Sign Up'}>
      <form onSubmit={handleSubmit}>
        {mode === 'signup' && <input placeholder="Name" ... />}
        <input type="email" placeholder="Email" ... />
        <input type="password" placeholder="Password" ... />
        <button type="submit">{mode === 'signin' ? 'Sign In' : 'Create Account'}</button>
      </form>
    </Modal>
  )
}
```

### Key Points

- **Mode passed from parent** - No internal toggle between signin/signup
- **Two-step signup** - Form → verify code
- **Error handling** - Better Auth returns `{ data, error }`, not throws
- **Code input** - 6 digits, centered, large text
- **Resend option** - Button to request new code

## Confirm Modal Pattern

```tsx
// src/components/modals/ConfirmModal.tsx
import { Modal } from '../Modal'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
}

export function ConfirmModal({ isOpen, onClose, onConfirm, title, message }: ConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <p className="text-gray-600 mb-4">{message}</p>
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="px-4 py-2 border rounded">
          Cancel
        </button>
        <button
          onClick={() => { onConfirm(); onClose(); }}
          className="px-4 py-2 bg-sky-500 text-white rounded"
        >
          Confirm
        </button>
      </div>
    </Modal>
  )
}
```

## Modal State Pattern

For apps with many modals, consider a modal state object:

```tsx
const [modals, setModals] = useState({
  auth: false,
  confirm: false,
  settings: false,
})

const openModal = (name: keyof typeof modals) =>
  setModals(m => ({ ...m, [name]: true }))

const closeModal = (name: keyof typeof modals) =>
  setModals(m => ({ ...m, [name]: false }))
```

## Related

- [layout.md](layout.md) - Overall app layout
- [src-structure.md](src-structure.md) - Directory organization
- [../04-auth/better-auth.md](../04-auth/better-auth.md) - Auth setup