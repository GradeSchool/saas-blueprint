---
last_updated: 2026-01-25
updated_by: vector-projector
change: "Updated port guidance - blueprint runs on 4001, apps on 5173"
status: planned
---

# Google OAuth Setup

Step-by-step guide to configure Google OAuth for a SaaS app.

## Overview

**One Google account for all apps:** `weheartdotart@gmail.com`

**Separate Cloud Console project per app:** Each app gets its own project so the consent screen shows the correct app name and logo.

---

## Step 1: Go to Google Cloud Console

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Sign in with `weheartdotart@gmail.com`

---

## Step 2: Create a New Project

1. Click the project dropdown (top left, next to "Google Cloud")
2. Click **New Project**
3. Project name: `vector-projector` (or your app name)
4. Organization: Leave as default or select if you have one
5. Click **Create**
6. Wait for project to be created, then select it

---

## Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Click **Get Started**

### Substep 1: App Information

| Field | Value |
|-------|-------|
| App name | `Vector Projector` |
| User support email | `weheartdotart@gmail.com` |

Click **Next**

### Substep 2: Audience

Select **External** (allows any Google user to sign in)

Click **Next**

### Substep 3: Contact Information

| Field | Value |
|-------|-------|
| Developer contact email | `weheartdotart@gmail.com` |

Click **Next**

### Substep 4: Finish

Review the summary and click **Create** (or **Continue to Dashboard**)

You'll land on the **Google Auth Platform** overview page with a sidebar containing: Overview, Branding, Audience, Clients, Data Access, Verification Center, Settings.

---

## Step 4: Create OAuth Client

1. In the sidebar, click **Clients**
2. Click **+ Create Client** (at top of page)
3. Application type dropdown: Select **Web app**
4. Fill in:

| Field | Value |
|-------|-------|
| Name | `Vector Projector Web Client` |

### Authorized JavaScript Origins

Click **+ Add** and enter:

**Development:**
```
http://localhost:5173
```

**Production (add later):**
```
https://vectorprojector.weheart.art
```

### Authorized Redirect URIs

Click **+ Add** and enter:

**Development:**
```
http://localhost:5173/api/auth/callback/google
```

**Production (add later):**
```
https://vectorprojector.weheart.art/api/auth/callback/google
```

5. Click **Create**

> **CRITICAL: Port 5173 Convention**
>
> All SaaS apps use port **5173** for development. The blueprint frontend runs on port **4001** to avoid conflicts.
>
> **Before starting development on any app:**
> 1. Stop any other Vite dev servers (other SaaS apps)
> 2. Ensure your app will be the first Vite app to start
> 3. Verify it runs on port 5173 (check terminal output)
>
> Google OAuth is configured for port 5173. If your app runs on a different port, OAuth will fail with `redirect_uri_mismatch`.
>
> **If OAuth fails:**
> 1. Check what port your app is running on
> 2. Stop other Vite apps and restart yours
> 3. Or temporarily update Google Console (not recommended - keep it consistent at 5173)

---

## Step 5: Save Credentials

After creation, you'll see your Client ID and Client Secret.

### Download the JSON (Recommended)

1. Click **Download JSON** (or the download icon)
2. Move the downloaded file to your app's root directory
3. The file will be named like: `client_secret_XXXXX.apps.googleusercontent.com.json`

> **CRITICAL: This file is gitignored**
>
> The pattern `client_secret_*.json` should already be in your `.gitignore`.
> If not, add it NOW before committing:
> ```gitignore
> # Google OAuth credentials
> client_secret_*.json
> ```
>
> See [../01-setup/stack.md](../01-setup/stack.md) for the standard gitignore patterns.

### What's in the JSON

The file contains:
- **Client ID:** `xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com`
- **Client Secret:** `GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx`
- Authorized origins and redirect URIs

You'll need the Client ID and Client Secret for the next step.

---

## Step 6: Add to Convex Environment Variables

1. Go to [dashboard.convex.dev](https://dashboard.convex.dev)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add:

| Name | Value |
|------|-------|
| `GOOGLE_CLIENT_ID` | Your Client ID |
| `GOOGLE_CLIENT_SECRET` | Your Client Secret |

5. Save

---

## Step 7: Update Better Auth Config

Add Google provider to `convex/auth.ts`:

```typescript
import { betterAuth } from "better-auth";

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth({
    // ... existing config
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      },
    },
    // ... rest of config
  });
};
```

---

## Step 8: Add Google Button to Frontend

Update `AuthModal.tsx` to include Google sign-in option:

```tsx
const handleGoogleSignIn = async () => {
  await authClient.signIn.social({ provider: 'google' })
}

// In the JSX:
<button onClick={handleGoogleSignIn}>
  Continue with Google
</button>
```

---

## Publishing the App

While in **Testing** mode, only test users can sign in.

To allow any Google user:

1. Go to **OAuth consent screen** (or **Audience** in sidebar)
2. Click **Publish App**
3. Confirm the warning

**Note:** For apps requesting sensitive scopes, Google may require verification. Our scopes (email, profile, openid) are not sensitive, so publishing should be straightforward.

---

## Per-App Setup

Repeat this process for each app:

| App | Project Name | Consent Screen Name |
|-----|--------------|---------------------|
| Vector Projector | `vector-projector` | Vector Projector |
| Tiler Styler | `tiler-styler` | Tiler Styler |
| etc. | etc. | etc. |

Each app gets its own project so users see the correct app name during sign-in.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Access blocked: This app's request is invalid" | Check redirect URI matches exactly |
| "Error 400: redirect_uri_mismatch" | Wrong port - ensure app runs on 5173, stop other Vite apps |
| Only test users can sign in | Publish the app (Step: Publishing) |
| Logo not showing on consent screen | May take time to propagate, or needs app verification |
| OAuth works sometimes, fails other times | Another Vite app took port 5173 - stop it and restart yours |
| Credentials leaked to git | Add `client_secret_*.json` to `.gitignore` immediately |

---

## Related

- [better-auth.md](better-auth.md) - Auth implementation
- [signup-signin-sessions-flow.md](signup-signin-sessions-flow.md) - Full flow guide
- [../01-setup/stack.md](../01-setup/stack.md) - Stack setup including gitignore patterns
- [../../platform/stack.md](../../platform/stack.md) - Platform services overview