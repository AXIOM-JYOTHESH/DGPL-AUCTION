# Implementation Plan: PostgreSQL (Prisma ORM) Migration for DGPL Auction

Migrate the DGPL Auction backend from MongoDB/Mongoose to PostgreSQL with Prisma ORM. This transition will establish strict relational integrity, native foreign keys, SQL check constraints (`budget >= 0`), and ACID transactions for live bidding while keeping the REST API and Socket.IO contracts 100% compatible with the existing React frontend.

---

## User Review Required

> [!IMPORTANT]
> **Database Connection:** 
> By default, we will configure Prisma to use a PostgreSQL connection string (`DATABASE_URL` in `config.env`).
> - You can plug in a **Supabase PostgreSQL URL** (e.g. `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`) or a **local PostgreSQL database URL** (e.g. `postgresql://postgres:password@localhost:5432/dgpl_auction`).
> - The React frontend code requires **zero changes** because we will maintain exact API and Socket.IO payload compatibility.

---

## Proposed Changes

```
┌─────────────────────────────────────────────────────────────┐
│                    PROPOSED ARCHITECTURE                    │
├─────────────────────────────────────────────────────────────┤
│  Frontend: React 19 + Socket.IO Client (Unchanged)          │
│       │ (REST & WebSockets)                                 │
│  Backend: Express 5 + Socket.IO Server                      │
│       │                                                     │
│  ORM Layer: Prisma Client (Replaces Mongoose)               │
│       │ (PostgreSQL Driver)                                 │
│  Database: PostgreSQL (Supabase or Local)                   │
│   ├── users (Auth, Roles, Foreign Keys)                     │
│   ├── teams (Budget CHECK >= 0, Captain FK)                 │
│   ├── players (Status, Category, Team FK)                   │
│   ├── bids (Relational Bid History with FKs)                │
│   └── app_config (Session Revocation)                       │
└─────────────────────────────────────────────────────────────┘
```

---

### Backend Dependencies & Configuration

#### [MODIFY] [`backend/package.json`](file:///e:/gulteez_auction/DGPL-Auction/backend/package.json)
- Add `@prisma/client` as a runtime dependency.
- Add `prisma` as a development dependency.
- Remove or phase out Mongoose dependencies as MongoDB is decommissioned.

#### [MODIFY] [`backend/config.env`](file:///e:/gulteez_auction/DGPL-Auction/backend/config.env)
- Add `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/dgpl_auction?schema=public"` (or user's Supabase connection string).

---

### Database Layer & Schemas

#### [NEW] [`backend/prisma/schema.prisma`](file:///e:/gulteez_auction/DGPL-Auction/backend/prisma/schema.prisma)
Define relational models matching the domain:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  admin
  captain
}

enum PlayerCategory {
  Batsman
  Bowler
  AllRounder  @map("All-Rounder")
  WicketKeeper @map("Wicket-Keeper")
}

enum PlayerStatus {
  unsold
  in_auction
  sold
}

model User {
  id               String         @id @default(uuid())
  name             String?
  email            String         @unique
  role             String?        @default("captain")
  password         String
  teamId           String?        @unique @map("team_id")
  team             Team?          @relation(fields: [teamId], references: [id], onDelete: SetNull)
  playerProfileId  String?        @unique @map("player_profile_id")
  playerProfile    Player?        @relation("UserPlayerProfile", fields: [playerProfileId], references: [id], onDelete: SetNull)
  createdAt        DateTime       @default(now()) @map("created_at")
  updatedAt        DateTime       @updatedAt @map("updated_at")

  @@map("users")
}

model Team {
  id         String     @id @default(uuid())
  name       String     @unique
  captainId  String?    @unique @map("captain_id")
  captain    Player?    @relation("TeamCaptain", fields: [captainId], references: [id], onDelete: SetNull)
  image      String?
  budget     Float      @default(100.0)
  players    Player[]   @relation("TeamPlayers")
  bids       Bid[]
  user       User?
  createdAt  DateTime   @default(now()) @map("created_at")
  updatedAt  DateTime   @updatedAt @map("updated_at")

  @@map("teams")
}

model Player {
  id             String          @id @default(uuid())
  name           String
  isCaptain      Boolean         @default(false) @map("is_captain")
  year           Int?
  image          String?
  category       String          // 'Batsman' | 'Bowler' | 'All-Rounder' | 'Wicket-Keeper'
  basePrice      Float?          @map("base_price")
  status         String          @default("unsold") // 'unsold' | 'in_auction' | 'sold'
  teamId         String?         @map("team_id")
  team           Team?           @relation("TeamPlayers", fields: [teamId], references: [id], onDelete: SetNull)
  finalBidPrice  Float?          @map("final_bid_price")
  bids           Bid[]
  captainOf      Team?           @relation("TeamCaptain")
  userProfile    User?           @relation("UserPlayerProfile")
  createdAt      DateTime        @default(now()) @map("created_at")
  updatedAt      DateTime        @updatedAt @map("updated_at")

  @@index([status])
  @@map("players")
}

model Bid {
  id         String     @id @default(uuid())
  playerId   String     @map("player_id")
  player     Player     @relation(fields: [playerId], references: [id], onDelete: Cascade)
  teamId     String     @map("team_id")
  team       Team       @relation(fields: [teamId], references: [id], onDelete: Cascade)
  bidAmount  Float      @map("bid_amount")
  timestamp  DateTime   @default(now())

  @@index([playerId])
  @@index([teamId])
  @@map("bids")
}

model AppConfig {
  id                    String     @id @default(uuid())
  sessionsInvalidatedAt DateTime   @default(now()) @map("sessions_invalidated_at")

  @@map("app_config")
}
```

#### [NEW] [`backend/prismaClient.js`](file:///e:/gulteez_auction/DGPL-Auction/backend/prismaClient.js)
- Singleton instance of `PrismaClient` with connection lifecycle management and error handling.

---

### Controllers & Business Logic

#### [MODIFY] [`backend/controllers/authController.js`](file:///e:/gulteez_auction/DGPL-Auction/backend/controllers/authController.js)
- Migrate `signin`: Query user via `prisma.user.findUnique({ where: { email } })`, verify password using `bcrypt.compare`.
- Migrate `protect` middleware: Verify JWT token timestamp against `prisma.appConfig.findFirst()`, query `currentUser` via `prisma.user.findUnique`.

#### [MODIFY] [`backend/controllers/playerController.js`](file:///e:/gulteez_auction/DGPL-Auction/backend/controllers/playerController.js)
- Migrate `getAllPlayers`: Support `includeCaptains` filter, year/category filters, include `team` and `bids` relations, format response to match expected frontend structure (`{ _id: id, name, ..., bidHistory: [...] }`).
- Migrate `getPlayer`: Query single player with team details and formatted `bidHistory`.
- Migrate `createPlayer`, `updatePlayer`, `deletePlayer`.

#### [MODIFY] [`backend/controllers/teamController.js`](file:///e:/gulteez_auction/DGPL-Auction/backend/controllers/teamController.js)
- Migrate `getAllTeams`: Query all teams including `players` and `captain` relations.
- Migrate `getTeam`, `createTeam`, `updateTeam`, `deleteTeam`.

#### [MODIFY] [`backend/controllers/auctionController.js`](file:///e:/gulteez_auction/DGPL-Auction/backend/controllers/auctionController.js)
- Migrate `startAuction`: Reset previous `in_auction` players, set target player status to `in_auction`, emit `new_player` event.
- Migrate `getCurrentAuctionPlayer`: Fetch currently active player with bid history.
- Migrate `sellPlayer`: Execute in a strict `prisma.$transaction`:
  1. Verify player is `in_auction` and team has sufficient `budget`.
  2. Update player: `status = 'sold'`, `teamId = teamId`, `finalBidPrice = finalBid`.
  3. Deduct team budget: `budget = budget - finalBid`.
  4. Emit `server:player_sold` event.
- Migrate `markPlayerUnsold`: Update player to `unsold` if no bids exist, emit `player_unsold`.

---

### Real-Time Socket Server & Seeding

#### [MODIFY] [`backend/server.js`](file:///e:/gulteez_auction/DGPL-Auction/backend/server.js)
- Replace Mongoose connection initialization with Prisma connection verification.
- Replace MongoDB socket JWT auth check with `prisma.user.findUnique` + `prisma.appConfig.findFirst()`.
- Refactor `captain:place_bid`:
  - Fetch active player and last bid.
  - Calculate tiered increment (`< 5` -> `+0.25`, `5-10` -> `+0.50`, `>= 10` -> `+1.00`).
  - Execute Prisma transaction to record the new `Bid` and update `player.finalBidPrice` & `player.teamId`.
  - Broadcast `server:new_bid` with identical frontend contract.

#### [MODIFY] [`backend/seed.js`](file:///e:/gulteez_auction/DGPL-Auction/backend/seed.js)
- Rewrite `importData()` using Prisma to import initial `teams.json`, `players.json`, and `users.json` into PostgreSQL with hashed passwords and proper foreign key relations.

---

## Verification Plan

### Automated & Database Verification
1. **Prisma Generation & Migration**:
   - Run `npx prisma generate` to verify types and schema.
   - Run `node seed.js` to seed teams, players, and users into PostgreSQL.
2. **REST API Endpoint Tests**:
   - `POST /api/v1/users/login` -> Verify token generation and user return.
   - `GET /api/v1/players` -> Verify player list with `bidHistory` compatibility.
   - `GET /api/v1/teams` -> Verify teams with captains and rosters.
   - `GET /api/v1/auction/current` -> Verify current auction state.

### Live Bidding & Integration Testing
3. **Auction Flow Simulation**:
   - Admin starts auction on a player (`POST /api/v1/auction/start`).
   - Captain places bids via Socket.IO -> Verify tiered increment and atomic DB insertion.
   - Admin sells player (`POST /api/v1/auction/sell`) -> Verify budget deduction and roster update.
   - Mark player unsold (`POST /api/v1/auction/unsold`) -> Verify status transition.
