import { Router } from 'express'
import { z } from 'zod'
import rateLimit from 'express-rate-limit'
import { env } from '../../config/env'
import { asyncHandler } from '../../middlewares/errorHandler'
import { validate } from '../../middlewares/validate'
import { autenticar } from '../../middlewares/auth'
import { login, logout, perfil, refresh } from './auth.service'
import { rateLimit as rateLimitError } from '../../utils/AppError'

export const authRouter = Router()

const REFRESH_COOKIE = 'refresh_token'
const cookieOpts = {
  httpOnly: true as const,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/api/v1/auth',
}

// Rate limiting de login: 5 intentos por ventana de 15 min por IP (Req 1.5).
const loginLimiter = rateLimit({
  windowMs: env.LOGIN_WINDOW_MIN * 60_000,
  limit: env.LOGIN_MAX_ATTEMPTS,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, _res, next) => next(rateLimitError()),
})

// En pruebas se desactiva el límite para no interferir con los flujos de auth.
const aplicarLoginLimiter = env.NODE_ENV === 'test'
  ? (_req: unknown, _res: unknown, next: () => void) => next()
  : loginLimiter

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) })

// POST /auth/login
authRouter.post('/login', aplicarLoginLimiter as never, validate({ body: loginSchema }), asyncHandler(async (req, res) => {
  const { email, password } = req.body as z.infer<typeof loginSchema>
  const sesion = await login(email, password)
  res.cookie(REFRESH_COOKIE, sesion.refreshToken, { ...cookieOpts, expires: sesion.refreshExpiraEn })
  res.json({ accessToken: sesion.accessToken, usuario: sesion.usuario })
}))

// POST /auth/refresh — rota el refresh y emite nuevo access token.
authRouter.post('/refresh', asyncHandler(async (req, res) => {
  const presented = req.cookies?.[REFRESH_COOKIE] as string | undefined
  const sesion = await refresh(presented ?? '')
  res.cookie(REFRESH_COOKIE, sesion.refreshToken, { ...cookieOpts, expires: sesion.refreshExpiraEn })
  res.json({ accessToken: sesion.accessToken, usuario: sesion.usuario })
}))

// POST /auth/logout — revoca el refresh y limpia la cookie.
authRouter.post('/logout', autenticar, asyncHandler(async (req, res) => {
  await logout(req.cookies?.[REFRESH_COOKIE])
  res.clearCookie(REFRESH_COOKIE, cookieOpts)
  res.json({ ok: true })
}))

// GET /auth/me
authRouter.get('/me', autenticar, asyncHandler(async (req, res) => {
  res.json(await perfil(req.usuario!.id))
}))
