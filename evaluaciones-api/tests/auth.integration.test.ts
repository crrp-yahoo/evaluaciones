import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import { createApp } from '../src/app'
import { prisma } from '../src/config/db'
import { hashPassword } from '../src/modules/auth/password'

// ─────────────────────────────────────────────────────────────────────────────
// Pruebas de integración de autenticación y roles (Req 1.1–1.4, 2.2, 2.3).
// Usan la app real + MariaDB. Crean usuarios con emails únicos de este run y
// limpian al final para no interferir con el seed ni con otras pruebas.
// ─────────────────────────────────────────────────────────────────────────────

const SUFIJO = `it-${Date.now()}`
const emailAdmin = `admin.${SUFIJO}@test.local`
const emailEstu = `estudiante.${SUFIJO}@test.local`
const PASS = 'password-1234'

let app: Express
const creados: bigint[] = []

function cookieDe(res: request.Response): string | undefined {
  const set = res.headers['set-cookie'] as unknown as string[] | undefined
  return set?.find((c) => c.startsWith('refresh_token='))
}

beforeAll(async () => {
  app = createApp()
  const admin = await prisma.usuario.create({
    data: { nombre: 'Admin IT', email: emailAdmin, passwordHash: await hashPassword(PASS), rol: 'admin' },
  })
  const estu = await prisma.usuario.create({
    data: { nombre: 'Estudiante IT', email: emailEstu, passwordHash: await hashPassword(PASS), rol: 'estudiante' },
  })
  creados.push(admin.id, estu.id)
})

afterAll(async () => {
  await prisma.refreshToken.deleteMany({ where: { usuarioId: { in: creados } } })
  await prisma.usuario.deleteMany({ where: { id: { in: creados } } })
  await prisma.$disconnect()
})

describe('POST /auth/login', () => {
  it('con credenciales válidas devuelve accessToken, usuario y cookie httpOnly', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: emailAdmin, password: PASS })
    expect(res.status).toBe(200)
    expect(res.body.accessToken).toBeTruthy()
    expect(res.body.usuario.email).toBe(emailAdmin)
    expect(res.body.usuario.rol).toBe('admin')
    const cookie = cookieDe(res)
    expect(cookie).toBeTruthy()
    expect(cookie).toMatch(/HttpOnly/i)
    expect(cookie).toMatch(/SameSite=Strict/i)
  })

  it('con credenciales inválidas responde 401 genérico sin revelar existencia', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: emailAdmin, password: 'incorrecta' })
    expect(res.status).toBe(401)
    expect(res.body.error.codigo).toBe('AUTH_INVALIDA')
    expect(res.body.error.mensaje).toBe('Credenciales inválidas')
  })

  it('con email inexistente responde el MISMO 401 genérico', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: `nadie.${SUFIJO}@test.local`, password: PASS })
    expect(res.status).toBe(401)
    expect(res.body.error.codigo).toBe('AUTH_INVALIDA')
  })

  it('con cuerpo inválido responde 422 VALIDACION', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'no-es-email', password: '' })
    expect(res.status).toBe(422)
    expect(res.body.error.codigo).toBe('VALIDACION')
  })
})

describe('GET /auth/me', () => {
  it('sin token responde 401 TOKEN_INVALIDO', async () => {
    const res = await request(app).get('/api/v1/auth/me')
    expect(res.status).toBe(401)
    expect(res.body.error.codigo).toBe('TOKEN_INVALIDO')
  })

  it('con token válido devuelve el perfil', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({ email: emailAdmin, password: PASS })
    const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${login.body.accessToken}`)
    expect(res.status).toBe(200)
    expect(res.body.email).toBe(emailAdmin)
  })
})

describe('POST /auth/refresh', () => {
  it('rota el refresh token y emite un nuevo access token', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({ email: emailAdmin, password: PASS })
    const cookie1 = cookieDe(login)!

    const res = await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie1)
    expect(res.status).toBe(200)
    expect(res.body.accessToken).toBeTruthy()
    const cookie2 = cookieDe(res)
    expect(cookie2).toBeTruthy()
    expect(cookie2).not.toBe(cookie1) // el token rotó

    // Reusar el refresh YA rotado debe fallar (detección de reutilización).
    const reuse = await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie1)
    expect(reuse.status).toBe(401)
    expect(reuse.body.error.codigo).toBe('TOKEN_INVALIDO')
  })

  it('sin cookie responde 401', async () => {
    const res = await request(app).post('/api/v1/auth/refresh')
    expect(res.status).toBe(401)
  })
})

describe('POST /auth/logout', () => {
  it('revoca el refresh token vigente', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({ email: emailAdmin, password: PASS })
    const cookie = cookieDe(login)!
    const out = await request(app).post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${login.body.accessToken}`).set('Cookie', cookie)
    expect(out.status).toBe(200)

    // Tras logout, ese refresh ya no sirve.
    const refresh = await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie)
    expect(refresh.status).toBe(401)
  })
})

describe('control de acceso por roles', () => {
  it('estudiante no puede acceder a /usuarios (403)', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({ email: emailEstu, password: PASS })
    const res = await request(app).get('/api/v1/usuarios').set('Authorization', `Bearer ${login.body.accessToken}`)
    expect(res.status).toBe(403)
    expect(res.body.error.codigo).toBe('PROHIBIDO')
  })

  it('admin sí puede acceder a /usuarios (200)', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({ email: emailAdmin, password: PASS })
    const res = await request(app).get('/api/v1/usuarios').set('Authorization', `Bearer ${login.body.accessToken}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.rows)).toBe(true)
  })
})
