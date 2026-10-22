import cron from 'node-cron'
import { prisma } from '../config/db'
import { logger } from '../config/logger'
import { calificarIntento } from '../modules/intentos/intentos.service'

// Job programado (Req 6.10): cierra y califica intentos de examen vencidos.
// Idempotente: calificarIntento ignora los que ya no están en curso.
export async function cerrarIntentosVencidos(ahora = new Date()): Promise<number> {
  const vencidos = await prisma.intento.findMany({
    where: { modo: 'examen', estado: 'en_curso', finLimite: { not: null, lt: ahora } },
    select: { id: true }, take: 200,
  })
  let cerrados = 0
  for (const v of vencidos) {
    try { await calificarIntento(v.id); cerrados++ }
    catch (e) { logger.error({ e, intentoId: v.id.toString() }, 'Fallo al cerrar intento vencido') }
  }
  if (cerrados) logger.info(`⏱️  Cierre de intentos: ${cerrados} intento(s) vencido(s) calificado(s)`)
  return cerrados
}

export function iniciarJobCierre(): void {
  // Cada minuto.
  cron.schedule('* * * * *', () => { void cerrarIntentosVencidos().catch((e) => logger.error({ e }, 'Job cierre')) })
  logger.info('🗓️  Job de cierre de intentos vencidos programado (cada minuto)')
}
