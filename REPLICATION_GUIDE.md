# DGPL Auction — Complete Replication & Setup Guide

This guide contains everything needed to replicate, set up, and run this project from scratch on any computer (Mac, Windows, or Linux) with **zero Docker requirement**.

---

## 1. Prerequisites
- **Node.js**: v18 or newer ([Download](https://nodejs.org/))
- **Git**: Installed on your system
- **No Docker needed**: Database runs in the cloud via Supabase + Prisma Accelerate over standard HTTPS (Port 443).

---

## 2. Clone the Repository
```bash
git clone <your-repo-url>
cd AUCTION_PRO
```

---

## 3. Install Dependencies

### Backend:
```bash
cd backend
npm install
```

### Frontend:
```bash
cd ../frontend
npm install
```

---

## 4. Configure Environment Variables

### A. Backend (`backend/config.env`)
Create or edit `backend/config.env`:
```env
PORT=7777
NODE_ENV=development

# Prisma Accelerate URL (Connects to Supabase over HTTPS Port 443)
DATABASE_URL="prisma://accelerate.prisma-data.net/?api_key=YOUR_PRISMA_ACCELERATE_API_KEY"

# Direct Supabase Connection (used for direct migrations if needed)
DIRECT_URL="postgresql://postgres:YOUR_DB_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres"

# JWT Authentication
JWT_SECRET=super_secret_dgpl_auction_jwt_token_key_2026
JWT_EXPIRES_IN=7d
JWT_EXPIRESIN=7d
CORS_ORIGIN=http://localhost:5173
BCRYPT_SALT_ROUNDS=12
```

> **Note on Database Connection**:
> If you already have the existing team's `config.env`, you can simply copy and paste it.
> If starting your own new Supabase project:
> 1. Create a free project on [supabase.com](https://supabase.com).
> 2. Copy the direct connection string from Project Settings -> Database.
> 3. Go to [console.prisma.io](https://console.prisma.io), create a new project, paste your Supabase direct string, and click **Enable Accelerate**.
> 4. Paste the generated `prisma://...` URL into `DATABASE_URL`.

### B. Frontend (`frontend/.env`)
Create or edit `frontend/.env`:
```env
VITE_API_URL=http://localhost:7777
```

---

## 5. Generate Prisma Client
Inside the `backend/` directory:
```bash
cd backend
npx prisma generate
```

---

## 6. Run the Application

Open two terminal windows:

### Terminal 1 (Backend):
```bash
cd backend
npm run dev
```
*Backend runs on `http://localhost:7777` with Socket.io real-time engine.*

### Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```
*Frontend runs on `http://localhost:5173` with Vite React.*

---

## 7. Accessing the Application

- **Live Auction Stage (Public / Captain View)**:  
  Open `http://localhost:5173/` in your browser.

- **Admin Control Console**:  
  Open `http://localhost:5173/admin` in your browser.

---

## 8. Default Login Credentials

### Administrator:
- **Email**: `admin@dgplauction.com`
- **Password**: `AdminPass123!`
- **Capabilities**: Draw random players, start/pause auction clock, 3-step gavel calls, toggle captain privacy mode, finalize auction.

### Team Captains:
| Team Name | Email | Password |
|---|---|---|
| **Unrivalled Knights** | `captain.unrivalledknights@dgplauction.com` | `CaptainPassUK` |
| **X1 Musketeers** | `captain.x1musketeers@dgplauction.com` | `CaptainPassXM` |
| **Power House** | `captain.powerhouse@dgplauction.com` | `CaptainPassPH` |
| **Intimidators** | `captain.intimidators@dgplauction.com` | `CaptainPassI4` |

---

## 9. Key Features Cheat Sheet

1. **Auto-Sell on Countdown Expiry**: When the auction clock reaches 0s, the player automatically sells to the highest bidder, deducts the purse points, and updates the roster.
2. **Custom Bid Increments**: Captains can choose `+0.25`, `+0.50`, `+1.00`, `+1.50`, or `+2.00 Pts` with live remaining purse preview before bidding.
3. **🎲 Draw Random Player**: In the admin console, click `Draw Random Player` to randomly introduce an available player to the live stage.
4. **🔒 Captain Privacy Mode**: Admin can toggle Privacy Mode on/off. When ON, rival teams' remaining points and purchase prices are masked as `🔒 Confidential` in the summary.
5. **🏁 Finalize Auction**: When the auction finishes, the admin clicks `Finalize Auction` to permanently release all financial stats and player prices publicly to everyone.
6. **📌 Target Watchlist**: Captains can pin target players in the player pool to float them to the top of their personal board.
