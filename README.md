# Plataforma de Exámenes en Línea

Aplicación web para crear, administrar y presentar exámenes, con dos modos para el
estudiante: **examen** (oficial, con tiempo y sin revelar respuestas) y **práctica**
(retroalimentación inmediata con la respuesta correcta y su explicación).

**Stack:** React (Vite) · Node.js (Express + TypeScript) · Prisma · MariaDB · JWT.

## Estructura

```
evaluaciones/
├── evaluaciones-api/   # Backend Express + Prisma (módulos por dominio)
├── evaluaciones-web/   # Frontend React + Vite + Tailwind + TanStack Query
├── docker-compose.yml  # MariaDB + api + web
└── .kiro/specs/        # Requisitos, diseño y plan de tareas
```

## Puesta en marcha con Docker (recomendado)

```bash
cp .env.example .env               # ajusta secretos y puertos
docker compose up --build -d       # levanta mariadb, api y web
# Primera vez: aplicar migraciones y sembrar datos de ejemplo
docker compose exec api npx prisma migrate deploy
docker compose exec api npm run prisma:seed
```

- Web: http://localhost:8083
- API (interna): puerto 3000; MariaDB publicada solo en loopback (127.0.0.1:3312).

## Desarrollo local (sin Docker para las apps)

```bash
# 1) Base de datos por Docker
docker compose up -d mariadb

# 2) Backend
cd evaluaciones-api
cp .env.example .env               # DATABASE_URL apunta a 127.0.0.1:3312
npm install
npm run prisma:generate
npm run prisma:migrate             # crea/aplica migraciones (necesita permisos de shadow DB)
npm run prisma:seed
npm run dev                        # API en http://localhost:3000

# 3) Frontend (otra terminal)
cd evaluaciones-web
npm install
npm run dev                        # http://localhost:5173 (proxy /api -> :3000)
```

> Nota: `prisma migrate dev` necesita permiso para crear la *shadow database*.
> En desarrollo: `GRANT ALL PRIVILEGES ON *.* TO 'examenes'@'%';`.

## Variables de entorno

Backend (`evaluaciones-api/.env`):

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Cadena de conexión MariaDB (provider `mysql`). |
| `JWT_SECRET` | Secreto del access token (≥16 caracteres). |
| `REFRESH_SECRET` | Secreto asociado al refresh. |
| `ACCESS_TOKEN_TTL_MIN` | Vigencia del access token (por defecto 15). |
| `REFRESH_TOKEN_TTL_DAYS` | Vigencia del refresh (por defecto 7). |
| `LOGIN_MAX_ATTEMPTS` / `LOGIN_WINDOW_MIN` | Rate limit de login (5 / 15 min). |
| `CORS_ORIGINS` | Lista separada por comas de orígenes permitidos. |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Admin inicial que crea el seed. |

## Usuarios de ejemplo (tras el seed)

| Rol | Correo | Contraseña |
|---|---|---|
| Admin | admin@examenes.local | admin1234 |
| Profesor | profesor@examenes.local | profesor1234 |
| Estudiante | estudiante1@examenes.local | estudiante1234 |
| Estudiante | estudiante2@examenes.local | estudiante1234 |

## Scripts

Backend:
- `npm run dev` — API con recarga.
- `npm run build` / `npm start` — compilar y ejecutar.
- `npm test` — pruebas (unitarias + integración; requiere MariaDB arriba).
- `npm run prisma:migrate` / `prisma:deploy` / `prisma:seed`.

Frontend:
- `npm run dev` / `npm run build` / `npm run preview`.

## Pruebas

```bash
cd evaluaciones-api && npm test      # Vitest + Supertest (necesita BD)
```

Las pruebas de integración crean sus propios datos con correos únicos y limpian al final.

## Seguridad (resumen)

- Access token JWT corto + refresh token opaco (hasheado SHA-256) rotado en cada uso,
  con detección de reutilización; cookie `httpOnly` · `Secure` · `SameSite=Strict`.
- Contraseñas con argon2id. Validación de entrada con Zod. Sanitización de HTML
  (enunciados/explicaciones). `helmet`, CORS por lista blanca, rate limit en login.
- El modo del intento (examen/práctica) se valida **siempre en el servidor**: durante
  un examen el cliente nunca recibe `esCorrecta` ni explicaciones.
- Job programado (node-cron) que cierra y califica los intentos vencidos.
