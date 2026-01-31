---
last_updated: 2026-01-30
updated_by: vector-projector
change: "Added convex-fs reference link"
status: tested
---

# Bunny.net Setup Guide

**Reference:** https://convexfs.dev/get-started/setup-bunny/

Step-by-step guide for setting up bunny.net storage, CDN, and security for a new app.

**Account:** `weheartdotart@gmail.com` (shared across all weheart.art apps)

---

## 1. Create Storage Zone

1. Log in to bunny.net dashboard
2. Go to **Storage** → **Add Storage Zone**
3. Configure:

| Setting | Value | Notes |
|---------|-------|-------|
| Storage name | `{app-name}` | e.g., `vector-projector` |
| Storage tier | Standard | Edge SSD requires Frankfurt |
| Main region | New York (NY) | Or closest to your users |
| Replication | Add regions as needed | e.g., Los Angeles (LA) |

4. Click **Create**

---

## 2. Create Pull Zone (CDN)

1. In your storage zone, click **Connected Pull Zones**
2. Click **+ Connect Pull Zone**
3. Configure:

| Setting | Value |
|---------|-------|
| Pull Zone Name | `{app-name}-cdn` |
| Storage Zone | (auto-selected) |
| Tier | Standard |
| Pricing Zones | Default (all) |

4. Click **Create**

---

## 3. Enable Force SSL

1. Go to **CDN** → select your pull zone
2. Go to **Security** → **General**
3. Enable **Force SSL**

---

## 4. Configure Hotlink Protection

Prevents other sites from embedding your files.

1. Go to **CDN** → select your pull zone
2. Go to **Security** → **Referrers**
3. Under **Allowed Referrers**, add:
   - `{app-domain}` (e.g., `vectorprojector.weheart.art`)
   - `localhost:5173` (for local dev)
   - `localhost` (alternative)

---

## 5. Enable Bunny Shield

Provides WAF, rate limiting, and DDoS protection.

1. Go to **CDN** → **Bunny Shield**
2. Click **Get Started**
3. Select **General** (not WordPress, Drupal, etc.)
4. Select **Basic (Free)** plan

---

## 6. Create Rate Limit Rule

Protects against download abuse.

1. Go to **CDN** → **Bunny Shield** → **Rate Limiting**
2. Click **Create Rate Limit Rule**

### Basic Info

| Field | Value |
|-------|-------|
| Name | `downloadRateLimit` |
| Description | `Download Rate Limit` |

### Request Matching

| Field | Value |
|-------|-------|
| Variable | `REQUEST_URI` |
| Operator | `BEGINSWITH` |
| Variable value | (leave blank) |
| Operator value | `/fs` |

### Transformations

Leave blank (no transformation needed)

### Rate Exceeding

| Field | Value |
|-------|-------|
| Counter Key | `IP Address` |
| Requests | `100` |
| Timeframe | `Per 10 Seconds` |

This allows 100 requests per 10 seconds per IP (600/minute).

### Response Action

| Field | Value |
|-------|-------|
| Action | `RateLimit` |
| Timeframe | `For 1 Minute` |

Exceeding the limit blocks the IP for 1 minute.

3. Click **Create**

---

## 7. Gather Environment Variables

Collect these values for Convex dashboard:

| Variable | Where to Find |
|----------|---------------|
| `BUNNY_STORAGE_ZONE` | Storage zone name (e.g., `vector-projector`) |
| `BUNNY_CDN_HOSTNAME` | Pull zone → Hostnames (e.g., `https://vector-projector-cdn.b-cdn.net`) |
| `BUNNY_TOKEN_KEY` | Pull zone → Security → Token Authentication |
| `BUNNY_API_KEY` | Storage zone → FTP & API Access → Password (not read-only) |
| `BUNNY_REGION` | Region code if not Frankfurt (see below) |

### Region Codes

| Code | Region |
|------|--------|
| `de` | Frankfurt (default, omit if using this) |
| `ny` | New York |
| `la` | Los Angeles |
| `sg` | Singapore |
| `uk` | United Kingdom |
| `se` | Sweden |
| `br` | Brazil |
| `jh` | Johannesburg |
| `syd` | Sydney |

---

## 8. Add to Convex Dashboard

1. Go to Convex Dashboard → your project
2. Go to **Settings** → **Environment Variables**
3. Add each variable:

```
BUNNY_STORAGE_ZONE=vector-projector
BUNNY_CDN_HOSTNAME=https://vector-projector-cdn.b-cdn.net
BUNNY_TOKEN_KEY=(from token auth screen)
BUNNY_API_KEY=(from FTP & API access)
BUNNY_REGION=ny
```

---

## Vector Projector Reference

Completed setup for vector-projector:

| Setting | Value |
|---------|-------|
| Storage Zone | `vector-projector` |
| Pull Zone | `vector-projector-cdn` |
| Storage Tier | Standard |
| Main Region | New York (NY) |
| Replication | Los Angeles (LA) |
| Force SSL | Enabled |
| Bunny Shield | Basic (Free) |
| Rate Limit | 100 req/10s per IP on `/fs` |
| Hotlink Protection | vectorprojector.weheart.art, localhost |

---

## Checklist for New Apps

- [ ] Create storage zone with app name
- [ ] Add replication regions
- [ ] Create pull zone (`{app}-cdn`)
- [ ] Enable Force SSL
- [ ] Configure allowed referrers (hotlink protection)
- [ ] Enable Bunny Shield (Basic/Free)
- [ ] Create rate limit rule for `/fs`
- [ ] Gather all env vars
- [ ] Add env vars to Convex dashboard
