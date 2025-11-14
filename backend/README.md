# nxt-bus Backend

## Database Setup

### Running Migrations

1. Make sure PostgreSQL is running and environment variables are set:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

2. Run migrations:
```bash
npm run migrate:up
```

3. Seed the database with sample data:
```bash
npm run seed
```

### Migration Commands

- `npm run migrate:create <name>` - Create a new migration
- `npm run migrate:up` - Run all pending migrations
- `npm run migrate:down` - Rollback the last migration

### Test Credentials

After seeding, you can use these credentials:

- **Passenger**: `passenger@test.com` / `password123`
- **Driver**: `driver@test.com` / `password123`
- **Admin**: `admin@test.com` / `password123`

## Development

```bash
npm run dev
```

The server will start on http://localhost:3000

## API Endpoints

- `GET /health` - Health check endpoint
