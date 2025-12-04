# Testing Setup

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- test/routes/api/auth.test.js
```

## Test Setup

Tests use PostgreSQL via Testcontainers:
- Spins up PostgreSQL and MinIO containers automatically
- Requires Docker to be running
- Containers are cleaned up after tests complete

## Test Files

- `helper.js` - Test setup and teardown logic
- `fixtures/` - Test data fixtures
- `routes/api/` - API route tests
- `structure/` - Architecture/structure tests

## Troubleshooting

**Tests fail with Prisma errors:**
- Make sure Prisma client is generated: `npm run prisma:generate`

**MinIO tests fail:**
- Make sure Docker is running
- Check for orphaned containers: `docker ps`
- Clean up containers: `docker compose down`

**PostgreSQL tests fail:**
- Ensure Docker is running
- Check for orphaned containers: `docker ps`
- Clean up containers: `docker compose down`
