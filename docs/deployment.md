# Deployment Guide

## Architecture

- Frontend: Expo web export on Vercel
- Backend: Node HTTP API on Railway
- Database: MySQL on Railway
- Source control: GitHub

## GitHub

1. Create a new repository.
2. Push this project to the `main` branch.
3. Connect the same repository to Vercel and Railway.

## Railway

1. Create a new Railway project from GitHub.
2. Add a MySQL service in the same Railway project.
3. Import `database/setup.sql` into the MySQL instance. If you prefer, you can still import `database/schema.sql` and then `database/seed.sql`.
4. Set the start command to `npm run api:start`.
5. Add MySQL environment variables to the backend service:
   `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`.
   Railway can also provide `MYSQL_URL` or `DATABASE_URL`.
6. Railway will expose a public URL for the backend API.
7. Confirm `https://your-railway-url/api/health` returns `ok`.

## Vercel

1. Create a new Vercel project from GitHub.
2. Use the build command `npm run web:build`.
3. Use `dist` as output directory.
4. Add environment variable `EXPO_PUBLIC_API_URL` with your Railway URL.

## Local test

- Frontend dev: `npm run web`
- Backend dev: `npm run api:start`
- Frontend build: `npm run web:build`
- MySQL full install: import `database/setup.sql`
- MySQL split install: import `database/schema.sql` and then `database/seed.sql`

## Production note

If `EXPO_PUBLIC_API_URL` or MySQL are missing, the app uses local fallback content. That keeps the frontend usable while you are still configuring Railway.
