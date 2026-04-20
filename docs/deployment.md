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
4. The repository already ships with [railway.json](/abs/path/C:/xampp/htdocs/duoapp/MyApp0/railway.json):
   - start command: `npm run api:start`
   - healthcheck path: `/api/health`
   - healthcheck timeout: `120`
5. Add backend environment variables using [.env.railway.example](/abs/path/C:/xampp/htdocs/duoapp/MyApp0/.env.railway.example) as reference:
   - `AUTH_SECRET`
   - `AUTH_TOKEN_TTL_SECONDS`
   - `MYSQL_URL`
   - or alternatively `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`
6. Railway will expose a public URL for the backend API.
7. Confirm `https://your-railway-url/api/health` returns `ok`.

## Vercel

1. Create a new Vercel project from GitHub.
2. The repository already ships with [vercel.json](/abs/path/C:/xampp/htdocs/duoapp/MyApp0/vercel.json):
   - build command: `npm run web:build`
   - output directory: `dist`
   - `cleanUrls: true`
3. Add environment variable `EXPO_PUBLIC_API_URL` with your Railway URL using [.env.vercel.example](/abs/path/C:/xampp/htdocs/duoapp/MyApp0/.env.vercel.example) as reference.
4. If `EXPO_PUBLIC_API_URL` is missing in production, the frontend now throws a clear deployment error instead of trying to call `localhost`.

## Local test

- Frontend dev: `npm run web`
- Backend dev: `npm run api:start`
- Frontend build: `npm run web:build`
- Full deployment validation: `npm run deploy:check`
- MySQL full install: import `database/setup.sql`
- MySQL split install: import `database/schema.sql` and then `database/seed.sql`

## Production note

If MySQL is missing, the backend can still fall back to local content for non-auth catalog data. If `EXPO_PUBLIC_API_URL` is missing in Vercel, the frontend now shows a clear deployment error for live API flows such as login, registration, dashboards, and exercise evaluation instead of trying to call `localhost`.
