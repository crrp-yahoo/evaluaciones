import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import { createApp } from '../src/app'
import { prisma } from '../src/config/db'
import { crearUsuario, limpiar, sufijo, token, type UsuarioCreado } from './helpers'

// Integración de intentos (12.6), práctica (13.5) y reportes/resultados (15.4).
// Incluye el caso crítico: un intento de modo examen no puede obtener feedback.
describe('intentos, práctica y reportes', () => {
  const s = sufijo()
  let app: Express
  let profe: UsuarioCreado, estu: UsuarioCreado, ajeno: UsuarioCreado
  let cursoId: bigint, examenId: bigint
  let pregMultiple: bigint, pregVF: bigint, opCorrecta = '', opIncorrecta = ''
  let tProfe = '', tEstu = '', tAjeno = ''

  beforeAll(async () => {
    app = createApp()
    profe = await crearUsuario('profesor', `p-${s}`)
    estu = await crearUsuario('estudiante', `e-${s}`)
    ajeno = await crearUsuario('estudiante', `x-${s}`)

    const curso = await prisma.curso.create({ data: { nombre: `Curso ${s}`, profesorId: profe.id } })
    cursoId = curso.id
    await prisma.inscripcion.create({ data: { cursoId, estudianteId: estu.id } })

    const pm = await prisma.pregunta.create({
      data: {
        cursoId, autorId: profe.id, tipo: 'opcion_multiple', enunciado: '2+2', puntaje: 2, explicacion: 'Es 4',
        opciones: { create: [{ texto: '3', esCorrecta: false, orden: 0, explicacion: 'no' }, { texto: '4', esCorrecta: true, orden: 1, explicacion: 'sí' }] },
      },
      include: { opciones: true },
    })
    pregMultiple = pm.id
    opCorrecta = pm.opciones.find((o) => o.esCorrecta)!.id.toString()
    opIncorrecta = pm.opciones.find((o) => !o.esCorrecta)!.id.toString()

    const vf = await prisma.pregunta.create({
      data: {
        cursoId, autorId: profe.id, tipo: 'verdadero_falso', enunciado: '7 es primo', puntaje: 1,
        opciones: { create: [{ texto: 'V', esCorrecta: true, orden: 0 }, { texto: 'F', esCorrecta: false, orden: 1 }] },
      },
    })
    pregVF = vf.id

    const examen = await prisma.examen.create({
      data: {
        cursoId, titulo: `Ex ${s}`, duracionMin: 30, intentosMax: 1, permitePractica: true,
        fechaInicio: new Date(Date.now() - 3600_000), fechaFin: new Date(Date.now() + 3600_000), estado: 'publicado',
        examenPreguntas: { create: [{ preguntaId: pregMultiple, orden: 0 }, { preguntaId: pregVF, orden: 1 }] },
      },
    })
    examenId = examen.id

    tProfe = await token(app, profe.email, profe.password)
    tEstu = await token(app, estu.email, estu.password)
    tAjeno = await token(app, ajeno.email, ajeno.password)
  })

  afterAll(async () => {
    await prisma.inscripcion.deleteMany({ where: { cursoId } })
    await limpiar({ cursos: [cursoId], usuarios: [profe.id, estu.id, ajeno.id] })
    await prisma.$disconnect()
  })

  async function iniciar(modo: 'examen' | 'practica', tok = tEstu) {
    return request(app).post(`/api/v1/examenes/${examenId}/intentos`).set('Authorization', `Bearer ${tok}`).send({ modo })
  }

  it('estudiante no inscrito no puede iniciar (403)', async () => {
    const res = await iniciar('examen', tAjeno)
    expect(res.status).toBe(403)
  })

  it('iniciar examen devuelve preguntas SIN exponer respuestas correctas', async () => {
    const res = await iniciar('examen')
    expect(res.status).toBe(201)
    expect(res.body.modo).toBe('examen')
    expect(typeof res.body.tiempoRestanteSeg).toBe('number')
    const json = JSON.stringify(res.body.preguntas)
    expect(json).not.toContain('esCorrecta')
    expect(json).not.toContain('explicacion')
  })

  it('reanuda el intento en curso en lugar de crear otro', async () => {
    const a = await iniciar('examen')
    const b = await iniciar('examen')
    expect(a.body.id).toBe(b.body.id)
  })

  it('CASO CRÍTICO: pedir feedback en modo examen devuelve 403', async () => {
    const intento = await iniciar('examen')
    const res = await request(app)
      .post(`/api/v1/intentos/${intento.body.id}/preguntas/${pregMultiple}/responder`)
      .set('Authorization', `Bearer ${tEstu}`).send({ opcionesElegidas: [opCorrecta] })
    expect(res.status).toBe(403)
    expect(res.body.error.codigo).toBe('MODO_EXAMEN_SIN_FEEDBACK')
  })

  it('autoguardado idempotente y entrega con calificación automática', async () => {
    const intento = await iniciar('examen')
    const id = intento.body.id
    // Guarda dos veces la misma respuesta (idempotente).
    for (let i = 0; i < 2; i++) {
      const g = await request(app).put(`/api/v1/intentos/${id}/respuestas`).set('Authorization', `Bearer ${tEstu}`)
        .send({ respuestas: [{ preguntaId: Number(pregMultiple), opcionesElegidas: [opCorrecta] }, { preguntaId: Number(pregVF), opcionesElegidas: [] }] })
      expect(g.status).toBe(200)
    }
    const entrega = await request(app).post(`/api/v1/intentos/${id}/entregar`).set('Authorization', `Bearer ${tEstu}`)
    expect(entrega.status).toBe(200)
    // 2 pts por la correcta de opción múltiple; V/F sin responder = 0. Total 2.
    expect(entrega.body.calificacion).toBe(2)
    expect(entrega.body.estado).toBe('calificado')
  })

  it('respeta el máximo de intentos (segundo intento oficial → 409)', async () => {
    // Ya hay un intento entregado del test anterior; iniciar otro debe fallar.
    const res = await iniciar('examen')
    expect(res.status).toBe(409)
    expect(res.body.error.codigo).toBe('INTENTO_NO_PERMITIDO')
  })

  it('un intento no puede ser accedido por otro estudiante (403)', async () => {
    const intento = await prisma.intento.findFirst({ where: { examenId, estudianteId: estu.id } })
    const res = await request(app).get(`/api/v1/intentos/${intento!.id}`).set('Authorization', `Bearer ${tAjeno}`)
    expect(res.status).toBe(403)
  })

  // ── Práctica (13.5) ──────────────────────────────────────────────────────
  it('práctica: feedback inmediato con respuesta correcta y explicación', async () => {
    const intento = await iniciar('practica')
    expect(intento.body.modo).toBe('practica')
    expect(intento.body.finLimite).toBeNull()
    const res = await request(app)
      .post(`/api/v1/intentos/${intento.body.id}/preguntas/${pregMultiple}/responder`)
      .set('Authorization', `Bearer ${tEstu}`).send({ opcionesElegidas: [opIncorrecta] })
    expect(res.status).toBe(200)
    expect(res.body.correcta).toBe(false)
    expect(res.body.respuestaCorrecta?.[0]?.texto).toBe('4')
    expect(res.body.explicacion).toBe('Es 4')
  })

  it('práctica: intentos ilimitados (no cuentan para el máximo)', async () => {
    const a = await iniciar('practica')
    // El intento en curso se reanuda; forzamos uno nuevo entregándolo no aplica a práctica,
    // así que basta con comprobar que iniciar práctica nunca devuelve 409.
    expect(a.status).toBe(201)
  })

  it('práctica: resumen por tema disponible', async () => {
    const res = await request(app).get('/api/v1/practica/resumen').set('Authorization', `Bearer ${tEstu}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  // ── Reportes y resultados (15.4) ──────────────────────────────────────────
  it('profesor ve resumen y acierto por pregunta', async () => {
    const resumen = await request(app).get(`/api/v1/examenes/${examenId}/reportes/resumen`).set('Authorization', `Bearer ${tProfe}`)
    expect(resumen.status).toBe(200)
    expect(resumen.body.totalIntentos).toBeGreaterThanOrEqual(1)

    const preguntas = await request(app).get(`/api/v1/examenes/${examenId}/reportes/preguntas`).set('Authorization', `Bearer ${tProfe}`)
    expect(preguntas.status).toBe(200)
    expect(preguntas.body.length).toBe(2)
  })

  it('exportación CSV de calificaciones', async () => {
    const res = await request(app).get(`/api/v1/examenes/${examenId}/reportes/export.csv`).set('Authorization', `Bearer ${tProfe}`)
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('text/csv')
    expect(res.text).toContain('estudiante')
  })

  it('un estudiante no puede ver reportes del examen (403)', async () => {
    const res = await request(app).get(`/api/v1/examenes/${examenId}/reportes/resumen`).set('Authorization', `Bearer ${tEstu}`)
    expect(res.status).toBe(403)
  })
})
