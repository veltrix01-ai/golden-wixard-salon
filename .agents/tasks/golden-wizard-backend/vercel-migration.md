# Vercel Migration Report — Golden Wizard Professional Salon

## Files Created

| File | Action | Reason |
|------|--------|--------|
| `api/index.ts` | **Created** | Vercel serverless function — full port of `netlify/functions/api.ts` using `VercelRequest`/`VercelResponse` signature |
| `vercel.json` | **Created** | Tells Vercel how to build and route requests |

## Files Already Correct (no changes needed)

| File | Status | Note |
|------|--------|------|
| `package.json` | ✅ Already had `@vercel/node: ^3.0.0` in devDependencies | No change needed |
| `vite.config.ts` | ✅ Already had `/api` proxy to `http://localhost:3000` | No change needed |
| `.gitignore` | ✅ Already had `.vercel` entry | No change needed |

## Files Preserved (not touched)

- `netlify/functions/api.ts` — kept as-is
- `netlify.toml` — kept as-is
- `server.ts` — kept as-is (used for local dev)
- All `server/services/` files
- All `server/middleware/` files
- All `server/validation/` files
- All `src/` frontend components
- `.env`
- `supabase/migrations/`

---

## How Vercel Routing Works

Vercel reads `vercel.json` at the project root. When a request arrives:

1. **`/api/*` requests** — the rewrite rule `"/api/(.*)" → "/api/index"` sends every API call to `api/index.ts`. That file is bundled as a single Node.js serverless function. The function reads `req.url`, strips the `/api` prefix, and dispatches to the right route handler internally (same logic as the old Netlify function).

2. **All other requests** — the rewrite rule `"/(.*)" → "/index.html"` serves the React SPA. Because Vite builds everything to `dist/`, Vercel serves `dist/index.html` for any path that isn't a static asset, so React Router handles client-side navigation without 404s.

Static assets in `dist/assets/` are served directly by Vercel's CDN — the SPA fallback only triggers when no static file matches.

---

## Environment Variables to Add in Vercel Dashboard

Go to **Vercel → Your Project → Settings → Environment Variables** and add all of these. Set them for **Production**, **Preview**, and **Development** as appropriate.

| Variable | Required | Purpose |
|----------|----------|---------|
| `SUPABASE_URL` | ✅ Required | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | ✅ Required | Supabase anonymous (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Required | Supabase service-role key (admin writes) |
| `OWNER_USERNAME` | ✅ Required | Owner login username |
| `OWNER_PASSWORD` | ✅ Required | Owner login password |
| `SESSION_SECRET` | ✅ Required | 32+ character random string for HMAC session signing |
| `TURNSTILE_SECRET_KEY_CLOUDFLARE` | ✅ Required | Cloudflare Turnstile secret key (server-side verification) |
| `VITE_TURNSTILE_SITE_KEY` | ✅ Required | Cloudflare Turnstile site key (frontend widget) |
| `OWNER_EMAIL` | Optional | Email address to receive new question notifications |
| `RESEND_API_KEY` | Optional | Resend API key for email notifications |
| `APP_URL` | Optional | Your deployed URL (used in email links), e.g. `https://your-app.vercel.app` |

> **Never** add `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET`, `OWNER_PASSWORD`, or `TURNSTILE_SECRET_KEY_CLOUDFLARE` as `VITE_` prefixed variables. The `VITE_` prefix exposes values to the browser bundle.

---

## Deployment Steps

1. **Push to GitHub**
   ```bash
   git add api/index.ts vercel.json
   git commit -m "feat: add Vercel serverless function and vercel.json config"
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com) → **Add New → Project**
   - Import your GitHub repository
   - Vercel will auto-detect Vite as the framework

3. **Set Environment Variables**
   - In the Vercel project settings → **Environment Variables**
   - Add every variable listed in the table above
   - Use separate values for Preview vs Production if needed

4. **Deploy**
   - Click **Deploy** (or push a commit — Vercel auto-deploys on push)
   - The build runs `npm run build` → outputs to `dist/`
   - `api/index.ts` is bundled as a serverless function automatically

5. **Verify**
   - Visit `https://your-app.vercel.app/api/admin/auth/status` — should return JSON
   - Visit `https://your-app.vercel.app/` — should show the React frontend
   - Test question submission from the public site
   - Log in to the admin dashboard at `/admin`

---

## How Local Development Still Works

Local dev is unchanged:

1. Start the Express server: `npm run dev` (runs `tsx server.ts` on port 3000)
2. Vite dev server starts on port 5173 (or similar) and proxies all `/api/*` requests to `http://localhost:3000`

The proxy in `vite.config.ts`:
```ts
proxy: {
  '/api': {
    target: 'http://localhost:3000',
    changeOrigin: true,
  },
},
```

This means your local browser hits `localhost:5173/api/questions`, Vite transparently forwards it to `localhost:3000/api/questions`, and you get the full Express server response — no Vercel CLI needed for local development.

The `api/index.ts` file is only used when deployed to Vercel. `server.ts` handles everything locally.
