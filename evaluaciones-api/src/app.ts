import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { corsOrigins, env } from './config/env'
import { prisma } from './config/db'
import { bigintReplacer } from './utils/json'
import { errorHandler, notFoundHandler } from './middlewares/errorHandler'
import { authRouter } from './modules/auth/auth.routes'
import { usuariosRouter } from './modules/usuarios/usuarios.routes'
import { cursosRouter, misCursosRouter } from './modules/cursos/cursos.routes'
import { preguntasRouter } from './modules/preguntas/preguntas.routes'
import { examenesRouter } from './modules/examenes/examenes.routes'
import { intentosRouter, examenesIntentosRouter } from './modules/intentos/intentos.routes'
import { resultadoIntentoRouter, reportesExamenRouter, practicaRouter } from './modules/reportes/reportes.routes'

export function createApp() {
  const app = express()
  app.set('trust proxy', 1)
  app.set('json replacer', bigintReplacer)

  app.use(helmet())
  app.use(cors({ origin: corsOrigins.length ? corsOrigins : true, credentials: true }))
  app.use(express.json({ limit: '1mb' }))
  app.use(cookieParser())

  // Health check (verifica la conexión a la base de datos).
  app.get('/health', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`
      res.json({ status: 'ok', service: 'evaluaciones-api', db: 'up', env: env.NODE_ENV, timestamp: new Date().toISOString() })
    } catch {
      res.status(503).json({ status: 'degraded', service: 'evaluaciones-api', db: 'down' })
    }
  })

  // ── Rutas de la API (prefijo /api/v1). Se montarán por módulo en fases siguientes. ──
  const api = express.Router()
  api.use('/auth', authRouter)
  api.use('/usuarios', usuariosRouter)
  api.use('/cursos', cursosRouter)
  api.use('/mis-cursos', misCursosRouter)
  api.use('/preguntas', preguntasRouter)
  api.use('/examenes', examenesIntentosRouter)
  api.use('/examenes', reportesExamenRouter)
  api.use('/examenes', examenesRouter)
  api.use('/intentos', resultadoIntentoRouter)
  api.use('/intentos', intentosRouter)
  api.use('/practica', practicaRouter)
  app.use('/api/v1', api)
  app.locals.apiRouter = api

  app.use(notFoundHandler)
  app.use(errorHandler)
  return app
}
