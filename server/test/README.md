# Testing Setup

## Fast Local Testing with SQLite

Tests now default to using SQLite for much faster execution without requiring Docker containers.

### Running Tests

```bash
# Fast SQLite tests (default, no Docker required)
npm test

# Run specific test file
npm test -- test/routes/api/auth.test.js
```

### Test Modes

1. **SQLite (Default)** - Fast, no Docker required
   ```bash
   npm test
   ```
   - Uses in-memory SQLite database
   - Tests run much faster
   - MinIO/S3 tests are skipped unless enabled

2. **SQLite + MinIO** - For tests requiring S3 storage
   ```bash
   npm run test:minio
   ```
   - Uses SQLite for database
   - Spins up MinIO container for S3 tests
   - Requires Docker

3. **PostgreSQL + Docker** - Full integration tests
   ```bash
   npm run test:postgres
   ```
   - Uses PostgreSQL via Testcontainers
   - Spins up PostgreSQL and MinIO containers
   - Requires Docker
   - Use for CI or when testing PostgreSQL-specific features

## How It Works

### SQLite Mode

When `TEST_USE_SQLITE=true`:
- Uses `prisma/schema.test.prisma` (SQLite-compatible schema)
- Removes PostgreSQL-specific features:
  - `citext` → regular `String` (case-insensitive handled in code)
  - `@db.Uuid` → `String` (SQLite doesn't have native UUIDs)
  - `gen_random_uuid()` → `uuid()` function
- Creates in-memory database (`:memory:`)
- Much faster database resets between tests

### MinIO Handling

- By default, MinIO is disabled in SQLite mode (faster)
- Tests that require S3 will be skipped
- Enable with `TEST_USE_MINIO=true` to run S3 tests

### Prisma Client Generation

The test script automatically:
1. Generates Prisma client from test schema (`pretest:sqlite`)
2. Runs tests
3. Restores main Prisma client (`posttest:sqlite`)

If you need the main Prisma client for development after running tests:
```bash
npm run prisma:generate
```

## Test Files

- `helper.js` - Test setup and teardown logic
- `fixtures/` - Test data fixtures
- `routes/api/` - API route tests
- `structure/` - Architecture/structure tests

## Troubleshooting

**Tests fail with Prisma errors:**
- Make sure test schema client is generated: `npm run pretest:sqlite`
- Restore main client if needed: `npm run prisma:generate`

**MinIO tests fail:**
- Make sure Docker is running
- Use `npm run test:minio` instead of `npm test`

**PostgreSQL tests fail:**
- Ensure Docker is running
- Check for orphaned containers: `docker ps`
- Clean up containers: `docker compose down`


