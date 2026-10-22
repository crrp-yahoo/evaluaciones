import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import { createApp } from '../src/app'
import { prisma } from '../src/config/db'
import { crearUsuario, limpiar, sufijo, token, type UsuarioCreado } from './helpers'

// Pruebas de integración del banco de preguntas (tarea 8.5): permisos por autor
// y versionado al editar una pregunta ya usada en un intento finalizado.
describe('preguntas — permisos y versionado', () => {
  const s = sufijo()
  let app: Express
  let profeA: UsuarioCreado, profeB: UsuarioCreado
  let cursoId: bigint
  let tokA = '', tokB = ''

  beforeAll(async () => {
    app = createApp()
    profeA = await crearUsuario('profesor', `a-${s}`)
    profeB = await crearUsuario('profesor', `b-${s}`)
    const curso = await prisma.curso.create({ data: { nombre: `Curso ${s}`, profesorId: profeA.id } })
    cursoId = curso.id
    tokA = await token(app, profeA.email, profeA.password)
    tokB = await token(app, profeB.email, profeB.password)
  })

  afterAll(async () => {
    await limpiar({ cursos: [cursoId], usuarios: [profeA.id, profeB.id] })
    await prisma.$disconnect()
  })

  async function crearPregunta(tok: string) {
    return request(app).post('/api/v1/preguntas').set('Authorization', `Bearer ${tok}`).send({
      cursoId: Number(cursoId), tipo: 'opcion_multiple', enunciado: 'Pregunta de prueba', puntaje: 1,
      explicacion: 'Explicación', opciones: [
        { texto: 'A', esCorrecta: true, orden: 0 },
        { texto: 'B', esCorrecta: false, orden: 1 },
      ],
    })
  }

  it('el profesor dueño del curso crea una pregunta (201)', async () => {
    const res = await crearPregunta(tokA)
    expect(res.status).toBe(201)
    expect(res.body.version).toBe(1)
  })

  it('un profesor que no es dueño del curso no puede crear preguntas ahí (403)', async () => {
    const res = await crearPregunta(tokB)
    expect(res.status).toBe(403)
  })

  it('rechaza opción múltiple con dos correctas (422)', async () => {
    const res = await request(app).post('/api/v1/preguntas').set('Authorization', `Bearer ${tokA}`).send({
      cursoId: Number(cursoId), tipo: 'opcion_multiple', enunciado: 'mal', puntaje: 1,
      opciones: [{ texto: 'A', esCorrecta: true, orden: 0 }, { texto: 'B', esCorrecta: true, orden: 1 }],
    })
    expect(res.status).toBe(422)
  })

  it('versiona al editar una pregunta ya usada en un intento finalizado', async () => {
    // Crea pregunta, examen publicado, estudiante inscrito, intento entregado.
    const estudiante = await crearUsuario('estudiante', `e-${s}`)
    await prisma.inscripcion.create({ data: { cursoId, estudianteId: estudiante.id } })
    const pregunta = await prisma.pregunta.create({
      data: {
        cursoId, autorId: profeA.id, tipo: 'verdadero_falso', enunciado: 'V/F', puntaje: 1, version: 1,
        opciones: { create: [{ texto: 'V', esCorrecta: true, orden: 0 }, { texto: 'F', esCorrecta: false, orden: 1 }] },
      },
    })
    const examen = await prisma.examen.create({
      data: {
        cursoId, titulo: `Ex ${s}`, duracionMin: 30,
        fechaInicio: new Date(Date.now() - 3600_000), fechaFin: new Date(Date.now() + 3600_000),
        estado: 'publicado', examenPreguntas: { create: [{ preguntaId: pregunta.id, orden: 0 }] },
      },
    })
    // Intento finalizado con snapshot de la pregunta en versión 1.
    const intento = await prisma.intento.create({
      data: { examenId: examen.id, estudianteId: estudiante.id, modo: 'examen', estado: 'calificado', inicio: new Date(), ordenSemilla: 1 },
    })
    await prisma.intentoPregunta.create({ data: { intentoId: intento.id, preguntaId: pregunta.id, version: 1, orden: 0 } })

    // Editar la pregunta → debe incrementar version a 2 y guardar historial.
    const res = await request(app).put(`/api/v1/preguntas/${pregunta.id}`).set('Authorization', `Bearer ${tokA}`).send({
      cursoId: Number(cursoId), tipo: 'verdadero_falso', enunciado: 'V/F (editada)', puntaje: 1,
      opciones: [{ texto: 'V', esCorrecta: true, orden: 0 }, { texto: 'F', esCorrecta: false, orden: 1 }],
    })
    expect(res.status).toBe(200)
    expect(res.body.version).toBe(2)
    const historial = await prisma.preguntaHistorial.count({ where: { preguntaId: pregunta.id, version: 1 } })
    expect(historial).toBe(1)

    // limpieza extra de este caso (respetando FKs: intento → inscripción → usuario)
    await prisma.intentoPregunta.deleteMany({ where: { intentoId: intento.id } })
    await prisma.intento.deleteMany({ where: { id: intento.id } })
    await prisma.inscripcion.deleteMany({ where: { estudianteId: estudiante.id } })
    await limpiar({ usuarios: [estudiante.id] })
  })
})
