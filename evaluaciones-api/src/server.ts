import { createApp } from './app'
import { env } from './config/env'
import { prisma } from './config/db'
import { logger } from './config/logger'
import { iniciarJobCierre } from './jobs/cierreIntentos'

const app = createApp()
const server = app.listen(env.PORT, () => {
  logger.info(`✅ evaluaciones-api escuchando en el puerto ${env.PORT} (${env.NODE_ENV})`)
})

// Job de cierre de intentos vencidos (no en test).
if (env.NODE_ENV !== 'test') iniciarJobCierre()

async function shutdown(signal: string) {
  logger.info(`${signal} recibido, cerrando…`)
  server.close(() => void 0)
  await prisma.$disconnect()
  process.exit(0)
}
process.on('SIGINT', () => void shutdown('SIGINT'))
process.on('SIGTERM', () => void shutdown('SIGTERM'))

export { app }
