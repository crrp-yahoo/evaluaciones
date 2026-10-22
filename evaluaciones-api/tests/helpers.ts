import request from 'supertest'
import type { Express } from 'express'
import { prisma } from '../src/config/db'
import { hashPassword } from '../src/modules/auth/password'

// ─────────────────────────────────────────────────────────────────────────────
// Utilidades para pruebas de integración: crean usuarios/curso/examen con ids
// únicos por ejecución y permiten limpiarlos al final sin tocar el seed.
// ─────────────────────────────────────────────────────────────────────────────

export const sufijo = () => `it-${Date.now()}-${Math.floor(Math.random() * 1e6)}`

export interface UsuarioCreado { id: bigint; email: string; password: string }

export async function crearUsuario(rol: 'admin' | 'profesor' | 'estudiante', s: string): Promise<UsuarioCreado> {
  const email = `${rol}.${s}@test.local`
  const password = 'password-1234'
  const u = await prisma.usuario.create({ data: { nombre: `${rol} ${s}`, email, passwordHash: await hashPassword(password), rol } })
  return { id: u.id, email, password }
}

export async function token(app: Express, email: string, password: string): Promise<string> {
  const res = await request(app).post('/api/v1/auth/login').send({ email, password })
  return res.body.accessToken as string
}

// Limpia en orden seguro respetando las FKs.
export async function limpiar(ids: { usuarios?: bigint[]; cursos?: bigint[] }) {
  if (ids.cursos?.length) {
    const examenes = await prisma.examen.findMany({ where: { cursoId: { in: ids.cursos } }, select: { id: true } })
    const examenIds = examenes.map((e) => e.id)
    if (examenIds.length) {
      const intentos = await prisma.intento.findMany({ where: { examenId: { in: examenIds } }, select: { id: true } })
      const intentoIds = intentos.map((i) => i.id)
      if (intentoIds.length) {
        await prisma.respuesta.deleteMany({ where: { intentoId: { in: intentoIds } } })
        await prisma.intentoPregunta.deleteMany({ where: { intentoId: { in: intentoIds } } })
        await prisma.eventoIntegridad.deleteMany({ where: { intentoId: { in: intentoIds } } })
        await prisma.intento.deleteMany({ where: { id: { in: intentoIds } } })
      }
      await prisma.examenPregunta.deleteMany({ where: { examenId: { in: examenIds } } })
      await prisma.examen.deleteMany({ where: { id: { in: examenIds } } })
    }
    const preguntas = await prisma.pregunta.findMany({ where: { cursoId: { in: ids.cursos } }, select: { id: true } })
    const pregIds = preguntas.map((p) => p.id)
    if (pregIds.length) {
      await prisma.preguntaHistorial.deleteMany({ where: { preguntaId: { in: pregIds } } })
      await prisma.opcion.deleteMany({ where: { preguntaId: { in: pregIds } } })
      await prisma.pregunta.deleteMany({ where: { id: { in: pregIds } } })
    }
    await prisma.inscripcion.deleteMany({ where: { cursoId: { in: ids.cursos } } })
    await prisma.curso.deleteMany({ where: { id: { in: ids.cursos } } })
  }
  if (ids.usuarios?.length) {
    await prisma.refreshToken.deleteMany({ where: { usuarioId: { in: ids.usuarios } } })
    await prisma.usuario.deleteMany({ where: { id: { in: ids.usuarios } } })
  }
}
