---
last_updated: 2026-01-26
updated_by: vector-projector
change: "Added cross-reference to custom domain docs for OAuth branding"
status: tested
tldr: "Step-by-step Google OAuth setup for Convex apps. Critical: redirect URI is Convex URL, not frontend."
topics: [auth, oauth, google, convex, setup]
---

# Google OAuth Setup

Step-by-step guide to configure Google OAuth for a SaaS app using Convex + Better Auth.

> **Canonical source:** Auth strategy is defined in [infrastructure.md](../../platform/infrastructure.md#auth-strategy). This file covers the step-by-step Google OAuth setup.

## Overview

**One Google account for all apps:** `weheartdotart@gmail.com`

**Separate Cloud Console project per app:** Each app gets its own project so the consent screen shows the correct app name and logo.

## Critical: Redirect URI for Convex

**For React/Vite apps with Convex, the OAuth redirect URI is NOT your frontend URL.**

Google redirects to Convex (which handles the OAuth callback), then Convex redirects to your frontend.

| What you might expect | What you actually use |
|----------------------|----------------------|
| `http://localhost:5173/api/auth/callback/google` | `https://your-deployment.convex.site/api/auth/callback/google` |

The pattern is: `https://[your-deployment].convex.site/api/auth/callback/google`

Find your deployment name in `.env.local` (the `CONVEX_DEPLOYMENT` value) or the Convex dashboard.

---

## Step 1: Go to Google Cloud Console

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Sign in with `weheartdotart@gmail.com`

---

## Step 2: Create a New Project

1. Click the project dropdown (top left, next to "Google Cloud")
2. Click **New Project**
3. Project name: `vector-projector` (or your app name)
4. Organization: Leave as default
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

Review and click **Create**

You'll land on the **Google Auth Platform** overview page.

---

## Step 4: Create OAuth Client

1. In the sidebar, click **Clients**
2. Click **+ Create Client**
3. Application type: **Web app**
4. Name: `Vector Projector Web Client`

### Authorized JavaScript Origins

| Environment | Origin |
|-------------|--------|
| Dev | `http://localhost:5173` |
| Dev (Convex) | `https://your-deployment.convex.site` |
| Prod | `https://vectorprojector.weheart.art` |

### Authorized Redirect URIs

**This is the critical part. Use your Convex site URL, not localhost.**

| Environment | Redirect URI |
|-------------|-------------|
| Dev | `https://your-deployment.convex.site/api/auth/callback/google` |
| Prod | `https://your-prod-deployment.convex.site/api/auth/callback/google` |

Replace `your-deployment` with your actual Convex deployment name (e.g., `amicable-shrimp-103`).

5. Click **Create**

---

## Step 5: Save Credentials

After creation, you'll see your Client ID and Client Secret.

### Download the JSON (Recommended)

1. Click **Download JSON**
2. Move to your app's root directory
3. File is named like: `client_secret_XXXXX.apps.googleusercontent.com.json`

> **This file is gitignored.** The pattern `client_secret_*.json` should be in `.gitignore`.

### What's in the JSON

- Client ID: `xxxx.apps.googleusercontent.com`
- Client Secret: `GOCSPX-xxxxxxxx`

---

## Step 6: Add to Convex Environment Variables

1. Go to [dashboard.convex.dev](https://dashboard.convex.dev)
2. Select your project
3. Settings → Environment Variables
4. Add:

| Name | Value |
|------|-------|
| `GOOGLE_CLIENT_ID` | Your Client ID |
| `GOOGLE_CLIENT_SECRET` | Your Client Secret |

5. Save (Convex redeploys automatically)

---

## Step 7: Update Frontend .env.local

Make sure you have the Convex site URL:

```bash
VITE_CONVEX_SITE_URL=https://your-deployment.convex.site
```

This is used by the auth client for the `baseURL`.

---

## Troubleshooting

| Error | Cause | Solution |
|-------|-------|----------|
| `redirect_uri_mismatch` | Wrong redirect URI in Google Console | Use `convex.site` URL, not localhost |
| `Access blocked: invalid request` | Redirect URI not registered | Add exact URI to Google Console |
| 404 on auth routes | Using `.convex.cloud` instead of `.convex.site` | Check VITE_CONVEX_SITE_URL |
| CORS error | Missing cors:true in http.ts | See [better-auth.md](better-auth.md) |

### How to Find Your Convex Site URL

1. Check `.env.local` for `CONVEX_DEPLOYMENT` (e.g., `dev:amicable-shrimp-103`)
2. The site URL is: `https://amicable-shrimp-103.convex.site`
3. Or check Convex dashboard → your project → Settings

---

## Publishing the App

While in **Testing** mode, only test users can sign in.

To allow any Google user:

1. Go to **OAuth consent screen** (or **Audience** in sidebar)
2. Click **Publish App**
3. Confirm

Our scopes (email, profile, openid) are not sensitive, so publishing is straightforward.

---

## Consent Screen Branding Issue

> **⚠️ PRE-PRODUCTION TASK:** The OAuth consent screen shows the ugly Convex URL (e.g., "Sign in to amiable-yak-159.convex.site") instead of your app domain. This is unacceptable for production.

**The problem:** Google shows the redirect URI domain on the consent screen. Since we use `*.convex.site` for OAuth callbacks, users see that ugly URL.

**The solution:** Set up a custom domain for your Convex HTTP routes, then update the `CUSTOM_AUTH_SITE_URL` environment variable.

**Full documentation:** See [critical-notes.md](../00-overview/critical-notes.md#4-custom-domain-for-oauth-branding) for:
- Step-by-step custom domain setup
- Environment variable configuration
- Google Console updates required
- Verification checklist

This must be done before production launch.

---

## Per-App Setup

Repeat this process for each app:

| App | Project Name | Redirect URI |
|-----|--------------|-------------|
| Vector Projector | `vector-projector` | `https://[vp-deployment].convex.site/api/auth/callback/google` |
| Tiler Styler | `tiler-styler` | `https://[ts-deployment].convex.site/api/auth/callback/google` |

Each app has its own Convex deployment, so each has a different redirect URI.

---

## Lessons Learned

1. **The redirect URI is NOT localhost** - This is the most common mistake. Convex handles the OAuth callback.

2. **Click "see error details"** - When Google shows an error, click the link to see the exact redirect URI being sent. Then add that exact URI to Google Console.

3. **Dev and prod have different redirect URIs** - Because they're different Convex deployments with different `.convex.site` URLs.

4. **The consent screen shows your redirect domain** - Users see "Sign in to [domain]" where domain is your Convex site URL. Fix this with custom domains before production (see section above).

---

## Related

- [better-auth.md](better-auth.md) - Auth implementation (read this first)
- [signup-signin-sessions-flow.md](signup-signin-sessions-flow.md) - Full flow guide
- [../01-setup/stack.md](../01-setup/stack.md) - Stack setup including gitignore patterns
- [../00-overview/critical-notes.md](../00-overview/critical-notes.md) - Pre-production checklist including custom domain setup