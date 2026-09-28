# 🚀 DGPL Cricket Auction App — Complete Production Deployment Guide

This guide gives you the exact steps, platforms, and environment variables needed to take the **DGPL Cricket Auction App** live to production.

---

## 🏛️ System Architecture Overview

```
                      ┌────────────────────────────────────────┐
                      │             Google Forms               │
                      └──────────────────┬─────────────────────┘
                                         │ (Form Submission)
                                         ▼
                      ┌────────────────────────────────────────┐
                      │    Google Sheets (Apps Script Webhook) │
                      └──────────────────┬─────────────────────┘
                                         │ HTTPS POST
                                         ▼
┌────────────────────────┐      ┌───────────────────────────────┐
│        Frontend        │◄────►│            Backend            │
│       (Vercel)         │ HTTPS│   (Render or Railway Service) │
│   React 19 + Vite SPA  │  +WS │ Express + Socket.IO + Prisma  │
└────────────────────────┘      └──────────────┬────────────────┘
                                               │
                                               ▼
                                ┌───────────────────────────────┐
                                │           Database            │
                                │   Supabase PostgreSQL Cloud   │
                                └───────────────────────────────┘
```

---

## 📋 Where to Deploy Each Component

| Component | Recommended Platform | Why? | Cost |
|---|---|---|---|
| **Backend** | **Render** (`render.com`) or **Railway** (`railway.app`) | **Crucial:** Needs long-lived WebSocket connections for Socket.IO live bidding & timer. *(Do not use Vercel for the backend server)* | Free / $5 credit |
| **Frontend** | **Vercel** (`vercel.com`) | Ultra-fast global edge CDN, automatic HTTPS, zero-config SPA rewrites with `vercel.json` | 100% Free |
| **Database** | **Supabase** (`supabase.com`) | Already set up & connected to `db.pegdglhohcwcmbrirbil.supabase.co` | Free |
| **Webhook** | **Google Apps Script** | Built right into your Google Sheet, runs in Google's cloud 24/7 | 100% Free |

---

## 🔑 All Keys & Environment Variables Required

### 1. Backend Environment Variables (Render / Railway)

In your backend dashboard, add these environment variables:

| Variable Name | Value | Description |
|---|---|---|
| `NODE_ENV` | `production` | Enables production error handling & optimization |
| `PORT` | `7777` *(or let Render/Railway auto-assign)* | Port for Express & Socket.IO |
| `DATABASE_URL` | `prisma://accelerate.prisma-data.net/?api_key=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqd3RfaWQiOjEsInNlY3VyZV9rZXkiOiJza19fcE54ZG93Nl9TaFRaXzJSQmlYUkQiLCJhcGlfa2V5IjoiMDFNMVZZSFhYR0U0TjgyOUdIM1pRSlg2QzkiLCJ0ZW5hbnRfaWQiOiI4Mzg2M2QyZjRiNjNmMmE2NWVlYjBhZDBhZGVmZmI0NzQ4MmIxZjc3ZDg4N2RiYmQ1Y2FkZGQ2Y2YyMDJmMWE4IiwiaW50ZXJuYWxfc2VjcmV0IjoiOTQ4N2UzNGMtNjNiMS00MDg4LWExMWYtMmFkYjBhZDg3N2VjIn0.HL42JGAYhag4IfO6icIadmD3rl4EnciZD0_uYck6BLE` | Prisma Accelerate connection string |
| `DIRECT_URL` | `postgresql://postgres:Jyothesh%4013@db.pegdglhohcwcmbrirbil.supabase.co:5432/postgres` | Direct connection to Supabase database |
| `JWT_SECRET` | `super_secret_dgpl_auction_jwt_token_key_2026` | Secret key for signing user auth tokens |
| `JWT_EXPIRES_IN` | `7d` | JWT session lifetime |
| `JWT_EXPIRESIN` | `7d` | JWT lifetime fallback |
| `CORS_ORIGIN` | `https://your-frontend-app.vercel.app` *(or your custom domain `https://dgpl-auction.tech`)* | Frontend domain allowed to connect |
| `BCRYPT_SALT_ROUNDS` | `12` | Password hashing security strength |
| `WEBHOOK_SECRET` | *(Optional, leave blank if not using token verification)* | Secret for Google Forms webhook |

---

### 2. Frontend Environment Variables (Vercel)

In your Vercel project settings:

| Variable Name | Value | Description |
|---|---|---|
| `VITE_API_URL` | `https://your-backend-app.onrender.com` *(or your Railway backend URL)* | URL where the backend API & WebSockets live |

---

## 🛠️ Step-by-Step Launch Procedure

### Step 1: Commit and Push Your Code to GitHub
In your local terminal:
```bash
git add .
git commit -m "feat: complete Google Forms integration, admin approval workflow, and production deployment config"
git push origin Vivek1
```

---

### Step 2: Deploy the Backend on Render (5 Minutes)

1. Go to **[render.com](https://render.com)** and sign in with GitHub.
2. Click **New +** ➔ **Web Service**.
3. Connect your repository: `AXIOM-JYOTHESH/DGPL-AUCTION`.
4. Configure the settings:
   - **Name:** `dgpl-auction-backend` (or your choice)
   - **Branch:** `Vivek1` (or `main`)
   - **Root Directory:** `backend`
   - **Runtime:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Instance Type:** `Free`
5. Click **Advanced** ➔ **Add Environment Variable** and paste all backend keys from the table above.
6. Click **Create Web Service**.
7. Once deployed, copy your backend URL:
   `https://dgpl-auction-backend.onrender.com`

---

### Step 3: Deploy the Frontend on Vercel (3 Minutes)

1. Go to **[vercel.com](https://vercel.com)** and sign in with GitHub.
2. Click **Add New...** ➔ **Project**.
3. Import `AXIOM-JYOTHESH/DGPL-AUCTION`.
4. Configure project:
   - **Framework Preset:** `Vite`
   - **Root Directory:** Click **Edit** and select `frontend`
5. Under **Environment Variables**:
   - **Key:** `VITE_API_URL`
   - **Value:** `https://dgpl-auction-backend.onrender.com` *(from Step 2)*
6. Click **Deploy**.
7. Vercel will build and give you your live URL:
   `https://dgpl-auction-frontend.vercel.app` (or custom domain).

---

### Step 4: Update CORS in Backend

Now that you have your live frontend URL (e.g. `https://dgpl-auction-frontend.vercel.app`):
1. In Render dashboard, go to `dgpl-auction-backend` ➔ **Environment**.
2. Update `CORS_ORIGIN` to your Vercel URL:
   `https://dgpl-auction-frontend.vercel.app`
3. Render will automatically redeploy with the updated CORS setting in 30 seconds.

---

### Step 5: Update Google Sheets Apps Script for Production

Now you can point your Google Form responses to your permanent production backend:

1. Open your linked Google Sheet ➔ **Extensions** ➔ **Apps Script**.
2. Update line 18 in `GOOGLE_SHEET_APPS_SCRIPT.js`:
   ```javascript
   const WEBHOOK_URL = 'https://dgpl-auction-backend.onrender.com/api/v1/players/webhook/register';
   ```
3. Click **Save** (💾).
4. Run `testWebhookConnection` to verify it connects with `HTTP 200 OK`.
5. Ensure your **On form submit** trigger is active.

---

## 🔒 Default Admin Credentials for Live Launch

Once your production app is up, log in at:
`https://your-frontend-app.vercel.app/admin`

- **Email:** `admin@dgplauction.com`
- **Password:** `AdminPass123!`

*(Make sure to change the admin password in the database or admin portal after initial launch!)*
