# Internal Office Prediction Market

## Getting Started

### Prerequisites

1. Node.js 18+
2. PostgreSQL Database

### Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up Environment Variables:
   Copy `.env.example` to `.env` (or create it) and fill in:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/frmarket"
   AUTH_SECRET="generated_secret_here"
   AUTH_GOOGLE_ID="your_google_client_id"
   AUTH_GOOGLE_SECRET="your_google_client_secret"
   ```

3. Push Database Schema:
   ```bash
   npx prisma db push
   ```

4. Run the Development Server:
   ```bash
   npm run dev
   ```

## Features Implemented (v1 Draft)

- **Authentication**: Google SSO (NextAuth.js)
- **Market Creation**: Users can create Binary, Multiple Choice, or Numeric markets.
- **Market Feed**: List of active markets (filtering hidden markets).
- **Database Schema**: Complete Prisma schema for Users, Markets, Bets, Transactions.
- **UI**: Built with Tailwind CSS and shadcn/ui.

## Next Steps

- Implement Betting Interface (`/markets/[id]`).
- Implement Leaderboard (`/leaderboard`).
- Implement Points Transfer.
- Admin Dashboard.
