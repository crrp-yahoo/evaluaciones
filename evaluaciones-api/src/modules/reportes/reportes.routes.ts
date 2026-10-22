import { Router } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../../middlewares/errorHandler'
import { validate } from '../../middlewares/validate'
import { autenticar, requerirRol } from '../../middlewares/auth'
import * as svc from './reportes.service'

// Rutas montadas en distintos prefijos.
export const resultadoIntentoRouter = Router()   // /intentos/:id/resultado y calificar
export const reportesExamenRouter = Router()      // /examenes/:id/...
export const practicaRouter = Router()            // /practica/resumen

// GET /intentos/:id/resultado — estudiante dueño
resultadoIntentoRouter.get('/:id/resultado', autenticar, requerirRol('estudiante'),
  validate({ params: z.object({ id: z.coerce.bigint() }) }),
  asyncHandler(async (req, res) => { res.json(await svc.resultadoEstudiante(req.usuario!, BigInt(req.params.id!))) }))

// PUT /intentos/:id/respuestas/:preguntaId/calificar — profesor
const califBody = z.object({ puntaje: z.number().min(0), comentario: z.string().optional() })
resultadoIntentoRouter.put('/:id/respuestas/:preguntaId/calificar', autenticar, requerirRol('admin', 'profesor'),
  validate({ params: z.object({ id: z.coerce.bigint(), preguntaId: z.coerce.bigint() }), body: califBody }),
  asyncHandler(async (req, res) => {
    const { puntaje, comentario } = req.body as z.infer<typeof califBody>
    res.json(await svc.calificarManual(req.usuario!, BigInt(req.params.id!), BigInt(req.params.preguntaId!), puntaje, comentario))
  }))

const examenId = z.object({ id: z.coerce.bigint() })
const soloProfe = requerirRol('admin', 'profesor')

reportesExamenRouter.get('/:id/intentos', autenticar, soloProfe, validate({ params: examenId }),
  asyncHandler(async (req, res) => { res.json(await svc.intentosDeExamen(req.usuario!, BigInt(req.params.id!))) }))

reportesExamenRouter.get('/:id/reportes/resumen', autenticar, soloProfe, validate({ params: examenId }),
  asyncHandler(async (req, res) => { res.json(await svc.resumenExamen(req.usuario!, BigInt(req.params.id!))) }))

reportesExamenRouter.get('/:id/reportes/preguntas', autenticar, soloProfe, validate({ params: examenId }),
  asyncHandler(async (req, res) => { res.json(await svc.aciertoPorPregunta(req.usuario!, BigInt(req.params.id!))) }))

reportesExamenRouter.get('/:id/reportes/export.csv', autenticar, soloProfe, validate({ params: examenId }),
  asyncHandler(async (req, res) => {
    const csv = await svc.exportarCsv(req.usuario!, BigInt(req.params.id!))
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="calificaciones-${req.params.id}.csv"`)
    res.send(csv)
  }))

// GET /practica/resumen — estudiante
practicaRouter.get('/resumen', autenticar, requerirRol('estudiante'),
  asyncHandler(async (req, res) => { res.json(await svc.resumenPractica(req.usuario!)) }))
