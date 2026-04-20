# duocode

Plataforma de aprendizaje de programacion con frontend Expo Router, backend Node y base de datos MySQL lista para Railway.

## Stack

- Frontend: Expo Router + React Native Web
- Backend: Node HTTP API
- Base de datos: MySQL
- Deploy frontend: Vercel
- Deploy backend y MySQL: Railway
- Control de versiones: GitHub

## Que ya incluye

- Dashboard con estilo developer para `Inicio`, `Explorar`, `Game` y `Estadistica`
- Contenido compartido cargado desde API o fallback local
- Backend listo para leer desde MySQL
- Esquema SQL y datos seed iniciales
- Guia para reemplazar logos y assets de branding
- Configuracion base para Vercel y Railway

## Estructura importante

```text
app/                     frontend Expo Router
components/brand/        logo provisional reutilizable
data/                    contenido fallback local
database/schema.sql      esquema MySQL
database/seed.sql        datos iniciales MySQL
database/setup.sql       instalacion completa en un solo archivo
docs/branding-guide.md   guia para cambiar logos
docs/deployment.md       guia de deploy
server/                  API lista para Railway
```

## Desarrollo local

1. Instala dependencias:

```bash
npm install
```

2. Levanta el frontend:

```bash
npm run web
```

3. Levanta la API:

```bash
npm run api:start
```

Arranque rapido en Windows para ver todo en localhost:

```bash
npm run local:all
```

## Variables de entorno

Crea tu `.env` usando como base `.env.example`.

Variables principales:

- `EXPO_PUBLIC_API_URL`
- `MYSQL_HOST`
- `MYSQL_PORT`
- `MYSQL_DATABASE`
- `MYSQL_USER`
- `MYSQL_PASSWORD`

Tambien puedes usar:

- `MYSQL_URL`
- `DATABASE_URL`

Archivos de ejemplo segun plataforma:

- [.env.example](/abs/path/C:/xampp/htdocs/duoapp/MyApp0/.env.example) para local
- [.env.railway.example](/abs/path/C:/xampp/htdocs/duoapp/MyApp0/.env.railway.example) para Railway
- [.env.vercel.example](/abs/path/C:/xampp/htdocs/duoapp/MyApp0/.env.vercel.example) para Vercel

## Configurar MySQL

Opcion rapida:

1. Importa solo `database/setup.sql`.

Opcion separada:

1. Crea una base llamada `duocode`.
2. Importa `database/schema.sql`.
3. Importa `database/seed.sql`.
4. Inicia la API con tus variables de entorno.

Credenciales demo incluidas:

- `admin@duocode.dev` / `admin12345`
- `student@duocode.dev` / `demo12345`
- `ana@duocode.dev` / `demo12345`

La API expone:

- `/api/health`
- `/api/content`
- `/api/auth/register`
- `/api/auth/login`
- `/api/auth/me`
- `/api/learner/dashboard`
- `/api/exercises/:id/evaluate`
- `/api/admin/dashboard`

## Deploy en Railway y Vercel

### Railway

1. Crea un proyecto nuevo desde GitHub.
2. Agrega un servicio MySQL.
3. Importa `database/setup.sql` o, si prefieres, `database/schema.sql` y luego `database/seed.sql`.
4. Configura el servicio backend con `npm run api:start`.
5. Usa estas variables en el backend:
   - `AUTH_SECRET`
   - `AUTH_TOKEN_TTL_SECONDS`
   - `MYSQL_URL` o alternativamente `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`
6. Railway ya tiene healthcheck recomendado en [railway.json](/abs/path/C:/xampp/htdocs/duoapp/MyApp0/railway.json) apuntando a `/api/health`.
7. Verifica `https://tu-api.up.railway.app/api/health`.

### Vercel

1. Conecta el repo de GitHub.
2. Usa `npm run web:build` como build command.
3. Usa `dist` como output directory.
4. Configura `EXPO_PUBLIC_API_URL` apuntando a Railway.
5. La configuracion en [vercel.json](/abs/path/C:/xampp/htdocs/duoapp/MyApp0/vercel.json) ya activa `cleanUrls` para servir mejor el export estatico.

## Checklist antes del deploy

Corre esto antes de subir cambios:

```bash
npm run deploy:check
```

## GitHub

Flujo recomendado:

```bash
git init
git add .
git commit -m "Initial duocode platform"
git branch -M main
git remote add origin TU_REPO
git push -u origin main
```

## Cambiar tus logos

Revisa:

- [docs/branding-guide.md](docs/branding-guide.md)

Archivos que vas a reemplazar:

- `assets/images/icon.png`
- `assets/images/favicon.png`
- `assets/images/splash-icon.png`
- `assets/images/android-icon-foreground.png`
- `assets/images/android-icon-background.png`
- `assets/images/android-icon-monochrome.png`

Si quieres cambiar tambien el logo visual dentro de la app, edita:

- [components/brand/brand-mark.tsx](components/brand/brand-mark.tsx)

## Nota

Si todavia no configuras Railway o MySQL, la app puede seguir mostrando contenido fallback local para que avances con el diseño y parte del frontend. Para login, registro, metricas reales y progreso autenticado, si necesitas configurar `EXPO_PUBLIC_API_URL` hacia tu backend en Railway.
