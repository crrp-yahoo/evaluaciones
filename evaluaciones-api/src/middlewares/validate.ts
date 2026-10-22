import type { NextFunction, Request, Response } from 'express'
import type { ZodTypeAny } from 'zod'
import { validacion } from '../utils/AppError'

type Fuentes = { body?: ZodTypeAny; query?: ZodTypeAny; params?: ZodTypeAny }

// Valida body/query/params con Zod (Req 11.1). Sustituye el valor por el parseado.
export function validate(esquemas: Fuentes) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (esquemas.body) req.body = esquemas.body.parse(req.body)
      if (esquemas.query) Object.assign(req.query, esquemas.query.parse(req.query))
      if (esquemas.params) Object.assign(req.params, esquemas.params.parse(req.params))
      next()
    } catch (e) {
      next(e instanceof Error && 'issues' in e ? validacion((e as { issues: unknown }).issues) : e)
    }
  }
}
