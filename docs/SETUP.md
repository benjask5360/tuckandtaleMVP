# Tuck and Tale MVP - Setup Guide

## Development Setup

This project uses a **remote-first** approach. Both development and production environments connect to the same remote Supabase database. Local Docker-based development has been retired.

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Git

### Initial Setup

1. **Clone the repository:**
```bash
git clone <repository-url>
cd tuckandtaleMVP
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure environment variables:**

Copy the example environment file and update with your credentials:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your remote Supabase credentials:
```env
# Supabase Configuration (Remote)
NEXT_PUBLIC_SUPABASE_URL=https://iolimejvugpcpnmruqww.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_KEY=your_service_key_here

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Leonardo.ai Configuration
LEONARDO_API_KEY=your_leonardo_api_key_here

# Google Gemini Configuration
GOOGLE_GEMINI_API_KEY=your_gemini_api_key_here

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

4. **Start the development server:**
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

---

## Database Management

### Supabase Remote Database

**Project Details:**
- Project URL: `https://iolimejvugpcpnmruqww.supabase.co`
- Dashboard: `https://supabase.com/dashboard/project/iolimejvugpcpnmruqww`

### Database Commands

All database operations are managed through npm scripts:

```bash
# Push pending migrations to remote
npm run db:push

# Check migration status
npm run db:status

# View schema differences
npm run db:diff

# Create a new migration
npm run db:new <migration_name>

# Run data migrations
npm run db:migrate <migration_name>

# Pull remote schema (rarely needed)
npm run db:pull
```

### Creating Migrations

#### Schema Migrations (Tables, Columns, etc.)

1. Create a new migration file:
```bash
npm run db:new add_user_preferences
```

2. Edit the created file in `supabase/migrations/`

3. Push to remote:
```bash
npm run db:push
```

#### Data Migrations (Inserts, Updates, etc.)

1. Edit `scripts/run-migration.js` to add your migration

2. Run the migration:
```bash
npm run db:migrate your-migration-name
```

See [MIGRATIONS.md](./MIGRATIONS.md) for detailed migration documentation.

---

## Production Deployment

### Deploy to Vercel

1. **Install Vercel CLI:**
```bash
npm i -g vercel
```

2. **Login to Vercel:**
```bash
vercel login
```

3. **Deploy:**
```bash
vercel --prod
```

### Configure Environment Variables in Vercel

Go to Project Settings > Environment Variables and add all variables from `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`
- `OPENAI_API_KEY`
- `LEONARDO_API_KEY`
- `GOOGLE_GEMINI_API_KEY`
- `NEXT_PUBLIC_APP_URL` (set to your production domain)
- `NODE_ENV` (set to `production`)

### Stripe Configuration (When Ready)

Add these additional environment variables for payments:
- `STRIPE_PUBLIC_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

---

## Project Structure

```
tuckandtaleMVP/
├── app/                    # Next.js app directory
├── components/             # React components
├── lib/                    # Utility functions and configurations
│   └── supabase/          # Supabase client configurations
├── scripts/               # Migration and utility scripts
│   ├── run-migration.js   # Universal migration runner
│   └── migrations/        # Legacy migration scripts (deprecated)
├── supabase/              # Supabase configuration
│   └── migrations/        # SQL migration files
├── types/                 # TypeScript type definitions
└── docs/                  # Documentation
    ├── SETUP.md          # This file
    └── MIGRATIONS.md     # Migration guide
```

---

## Troubleshooting

### Database Connection Issues

If you can't connect to the database:

1. **Check environment variables:**
```bash
echo $NEXT_PUBLIC_SUPABASE_URL
```

2. **Verify Supabase CLI is linked:**
```bash
npx supabase link --project-ref iolimejvugpcpnmruqww
```

3. **Check network connectivity:**
- Ensure no firewall is blocking connections
- Verify you have internet access

### Migration Errors

If migrations fail to push:

1. **Check migration status:**
```bash
npm run db:status
```

2. **Verify file naming:**
- Files must match pattern: `YYYYMMDDHHMMSS_name.sql`
- No special characters except underscores

3. **Review error messages:**
- Check for SQL syntax errors
- Verify foreign key constraints
- Ensure required tables exist

### Development Server Issues

If the dev server won't start:

1. **Clear Next.js cache:**
```bash
rm -rf .next
npm run dev
```

2. **Check port availability:**
```bash
lsof -i :3000  # Mac/Linux
netstat -ano | findstr :3000  # Windows
```

3. **Reinstall dependencies:**
```bash
rm -rf node_modules package-lock.json
npm install
```

---

## Legacy Docker Setup (Archived)

The project previously used Docker for local development. This has been retired in favor of connecting directly to the remote Supabase instance.

If you see references to:
- `http://127.0.0.1:54321` (local Supabase URL)
- `npx supabase start/stop` (Docker commands)
- `.env.local.docker-backup` (old configuration)

These are legacy and no longer used. All development now uses the remote database.

---

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Project Migration Guide](./MIGRATIONS.md)

---

## Support

For issues or questions:
1. Check the [MIGRATIONS.md](./MIGRATIONS.md) guide for database-related issues
2. Review the troubleshooting section above
3. Check the Supabase dashboard for database logs
4. Contact the development team