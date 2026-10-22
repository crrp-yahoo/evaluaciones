import 'dotenv/config'
import { z } from 'zod'

// Validación de variables de entorno al arranque (Req 11.6). Si falta/!inválida → exit(1).
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatoria'),

  JWT_SECRET: z.string().min(16, 'JWT_SECRET debe tener al menos 16 caracteres'),
  REFRESH_SECRET: z.string().min(16, 'REFRESH_SECRET debe tener al menos 16 caracteres'),
  ACCESS_TOKEN_TTL_MIN: z.coerce.number().int().positive().default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),

  LOGIN_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  LOGIN_WINDOW_MIN: z.coerce.number().int().positive().default(15),

  ADMIN_EMAIL: z.string().email().default('admin@examenes.local'),
  ADMIN_PASSWORD: z.string().min(6).default('admin1234'),
})

const parsed = schema.safeParse(process.env)
if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.') || '(raíz)'}: ${i.message}`).join('\n')
  console.error(`❌ Configuración de entorno inválida:\n${issues}`)
  process.exit(1)
}

export const env = parsed.data
export type Env = typeof env

/** Orígenes CORS permitidos como arreglo. */
export const corsOrigins = env.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
