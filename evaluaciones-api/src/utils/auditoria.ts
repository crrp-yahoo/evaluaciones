import { prisma } from '../config/db'
import { logger } from '../config/logger'

// Registra una acción en la tabla de auditoría (Req 2.5). No lanza si falla.
export async function registrarAuditoria(
  usuarioId: bigint | null,
  accion: string,
  detalle?: unknown,
): Promise<void> {
  try {
    await prisma.auditoria.create({
      data: { usuarioId, accion, detalle: detalle === undefined ? undefined : (detalle as object) },
    })
  } catch (e) {
    logger.error({ e }, 'No se pudo registrar la auditoría')
  }
}
