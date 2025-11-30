# Database Seed Script

This seed script populates your database with realistic test data for local development, testing, and staging environments.

## What Gets Created

### 👥 Users (10 total)
- **Core Users:**
  - `tombensim@gmail.com` (ADMIN)
  - `dev@genoox.com` (ADMIN)
  - `test@proph.bet` (USER)
- **Test Users:**
  - alice@example.com, bob@example.com, charlie@example.com, diana@example.com, eve@example.com, frank@example.com, grace@example.com

### 🏟️ Arenas (4 total)
1. **Tech Predictions** - AI, tech companies, open source
   - Logo: `/chami-thinking.png`
   - Slug: `tech-predictions`

2. **Sports Betting Arena** - Major sporting events
   - Logo: `/chami-happy.png`
   - Slug: `sports-betting`

3. **Finance & Markets** - Stocks, crypto, economic indicators
   - Logo: `/chami-judge.png`
   - Slug: `finance-markets`

4. **Entertainment & Pop Culture** - Movies, music, awards
   - Logo: `/chami-trending.png`
   - Slug: `entertainment`

Each arena includes:
- Custom settings (AMM type, fees, allocations)
- All users as members (first 2 as admins, rest as members)
- Rich "About" sections with markdown
- Cover images from `/public` assets

### 📊 Markets (19 total)
- **Binary Markets** (YES/NO) - ~40%
- **Multiple Choice Markets** (3-5 options) - ~40%
- **Numeric Range Markets** (ranges) - ~20%

Market distribution:
- Tech Arena: 5 markets
- Sports Arena: 4 markets
- Finance Arena: 4 markets
- Entertainment Arena: 4 markets
- Historical (resolved): 2 markets

### 💰 Activity
- **Bets**: 3-7 bets per open market (varied amounts: 50-250 points)
- **Price History**: 10 days of historical prices for charts
- **Comments**: 2-5 comments per active market
- **Transactions**: All bet placements and payouts tracked
- **Notifications**: For resolved markets and payouts

### 📰 Additional Data
- **Arena News**: 5 headlines per arena
- **Disputes**: 1 sample dispute on a resolved market
- **Invitations**: 2 pending invitations

## How to Run

### Method 1: Using npm script (recommended)
```bash
npm run db:seed
```

### Method 2: Using Prisma CLI
```bash
npx prisma db seed
```

### Method 3: Direct execution
```bash
npx tsx prisma/seed.ts
```

## Environment Requirements

The seed script will **NOT run** if:
- `NODE_ENV=production` (safety check)

The script is idempotent using `upsert` operations, so you can run it multiple times safely. Core users will be updated, not duplicated.

## Typical Workflow

### Local Development
```bash
# Start fresh
docker compose up -d
npx prisma db push
npm run db:seed
npm run dev
```

### Testing
```bash
# Set up test database
export DATABASE_URL="postgresql://test:test@localhost:5432/test_db"
npx prisma db push
npm run db:seed
npm test
```

### Reset and Reseed
```bash
# WARNING: This deletes all data
npx prisma db push --force-reset
npm run db:seed
```

## What You Get

After seeding, you can:

✅ Log in as any user (using OAuth in dev)
✅ Browse 4 diverse arenas with realistic content
✅ See active markets with existing bets and comments
✅ View price history charts with real data points
✅ Test betting, commenting, and market resolution
✅ See resolved markets with payouts
✅ Test invitations and arena management
✅ Review disputes and admin functionality

## Customization

To customize the seed data, edit `/prisma/seed.ts`:

- **Add more users**: Extend `TEST_USERS` array
- **Change arena themes**: Modify arena creation section
- **Add more markets**: Use helper functions `createBinaryMarket`, `createMultipleChoiceMarket`, `createNumericMarket`
- **Adjust bet amounts**: Change the amounts array in bet creation loop
- **Modify news headlines**: Edit arena news sections

## Troubleshooting

### Error: "Cannot connect to database"
Make sure your database is running and `DATABASE_URL` is set correctly:
```bash
docker compose up -d  # For local PostgreSQL
```

### Error: "Seed script cannot run in production"
This is intentional. Never seed production databases. Use staging or local environments.

### Error: "Unique constraint failed"
The script uses `upsert` for users, so this shouldn't happen. If it does, you may need to reset the database:
```bash
npx prisma db push --force-reset
npm run db:seed
```

## Integration with Migrations

This seed script is separate from the migration script (`seed-migration.ts`):

- **seed-migration.ts**: One-time migration of existing data (used in production)
- **seed.ts**: Development/test data seeding (never in production)

Run migrations first, then seed:
```bash
npx prisma migrate deploy  # Run migrations
npm run db:seed            # Add seed data
```

## Next Steps

After seeding, try:

1. **Browse arenas**: Visit `/arenas/tech-predictions`
2. **Place bets**: Test the betting interface
3. **Admin features**: Log in as `tombensim@gmail.com` or `dev@genoox.com`
4. **Create markets**: Test market creation flow
5. **Test resolution**: Resolve an open market
6. **Check notifications**: See generated notifications

Happy testing! 🎉

