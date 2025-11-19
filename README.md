# proph.bet

A modern social betting platform where users can create arenas, predict outcomes, and compete on leaderboards. Built with Next.js 15, Tailwind CSS, and Prisma.

## Features

### 🏟️ Arenas
- Create private or public betting groups ("Arenas").
- Invite members via unique links.
- Track performance with arena-specific leaderboards.
- Activity feeds showing recent bets and market creations.

### 📈 Markets & Betting
- Create diverse market types: **Binary** (Yes/No), **Multiple Choice**, and **Numeric**.
- AI-assisted market descriptions using Gemini.
- Upload evidence/attachments (S3-compatible storage).
- Real-time price charts and odds calculation.
- Comment system for discussing markets.

### 👤 User Experience
- **Authentication**: Secure Google SSO via NextAuth.js.
- **Internationalization**: Full support for English and Hebrew (RTL).
- **Points System**: Transfer points between users.
- **Notifications**: Email and in-app notifications for bet resolutions and invites.

### 🛠️ Admin & Management
- Admin dashboard for managing users and arenas.
- Dispute resolution system.
- Detailed transaction history.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL (via Prisma ORM)
- **Styling**: Tailwind CSS + shadcn/ui
- **Auth**: NextAuth.js v5
- **Storage**: MinIO (S3 compatible)
- **Emails**: Resend
- **AI**: Google Gemini
- **i18n**: next-intl

## Getting Started

### Prerequisites

1. Node.js 18+
2. Docker & Docker Compose (for local database and storage)

### Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment Setup:**
   Copy the example environment file:
   ```bash
   cp env.local.example .env
   ```
   
   Fill in the required values in `.env`:
   - `AUTH_SECRET`: Generate one (e.g., `openssl rand -base64 32`)
   - `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`: From Google Cloud Console
   - `GEMINI_KEY`: For AI features (optional)
   - `RESEND_API_KEY`: For emails (optional)

   *Note: Database and S3 config are pre-configured for the local Docker setup.*

3. **Start Development Environment:**
   This command starts the Postgres/MinIO containers and the Next.js dev server:
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:3000`.
   
   - **MinIO Console**: `http://localhost:9001` (User/Pass: `minioadmin`)
   - **Prisma Studio**: Run `npx prisma studio` to inspect the database.

4. **Database Management:**
   If you need to push schema changes manually:
   ```bash
   npx prisma db push
   ```

## Project Structure

- `/app`: Next.js App Router pages and API routes.
- `/components`: Reusable UI components (shadcn/ui, etc).
- `/lib`: Utility functions, hooks, and service configurations.
- `/prisma`: Database schema and seeds.
- `/messages`: i18n translation files.
