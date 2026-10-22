import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import { AppError } from '../utils/AppError'
import { logger } from '../config/logger'

// Formato de error estándar: { error: { codigo, mensaje, detalles? } } (diseño).
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: { codigo: err.codigo, mensaje: err.message, detalles: err.detalles } })
  }
  if (err instanceof ZodError) {
    return res.status(422).json({ error: { codigo: 'VALIDACION', mensaje: 'Error de validación', detalles: err.issues } })
  }
  logger.error({ err }, 'Error no controlado')
  return res.status(500).json({ error: { codigo: 'ERROR_INTERNO', mensaje: 'Error interno del servidor' } })
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: { codigo: 'NO_ENCONTRADO', mensaje: 'Ruta no encontrada' } })
}

// Envoltorio para handlers async que propaga errores a Express.
export function asyncHandler<T extends (req: Request, res: Response, next: NextFunction) => Promise<unknown>>(fn: T) {
  return (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next)
}
