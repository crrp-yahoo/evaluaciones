import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import argon2 from 'argon2'

// Datos semilla para desarrollo (Req 11.7): admin, profesor, estudiantes, un curso,
// preguntas con explicaciones y un examen con práctica habilitada.
const prisma = new PrismaClient()

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@examenes.local'
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'admin1234'
  const hash = (p: string) => argon2.hash(p)

  // 1) Usuarios
  const admin = await prisma.usuario.upsert({
    where: { email: adminEmail },
    update: {},
    create: { nombre: 'Administrador', email: adminEmail, passwordHash: await hash(adminPassword), rol: 'admin' },
  })
  const profe = await prisma.usuario.upsert({
    where: { email: 'profesor@examenes.local' },
    update: {},
    create: { nombre: 'Profesor Demo', email: 'profesor@examenes.local', passwordHash: await hash('profesor1234'), rol: 'profesor' },
  })
  const estu1 = await prisma.usuario.upsert({
    where: { email: 'estudiante1@examenes.local' },
    update: {},
    create: { nombre: 'Estudiante Uno', email: 'estudiante1@examenes.local', passwordHash: await hash('estudiante1234'), rol: 'estudiante' },
  })
  const estu2 = await prisma.usuario.upsert({
    where: { email: 'estudiante2@examenes.local' },
    update: {},
    create: { nombre: 'Estudiante Dos', email: 'estudiante2@examenes.local', passwordHash: await hash('estudiante1234'), rol: 'estudiante' },
  })

  // 2) Curso del profesor + inscripciones
  let curso = await prisma.curso.findFirst({ where: { nombre: 'Matemáticas I', profesorId: profe.id } })
  if (!curso) curso = await prisma.curso.create({ data: { nombre: 'Matemáticas I', profesorId: profe.id } })
  for (const est of [estu1, estu2]) {
    await prisma.inscripcion.upsert({
      where: { cursoId_estudianteId: { cursoId: curso.id, estudianteId: est.id } },
      update: {}, create: { cursoId: curso.id, estudianteId: est.id },
    })
  }

  // 3) Preguntas con explicaciones (si el curso aún no tiene)
  const yaHayPreguntas = await prisma.pregunta.count({ where: { cursoId: curso.id } })
  if (yaHayPreguntas === 0) {
    const p1 = await prisma.pregunta.create({
      data: {
        cursoId: curso.id, autorId: profe.id, tipo: 'opcion_multiple', enunciado: '¿Cuánto es 2 + 2?',
        puntaje: 1, tema: 'Aritmética', explicacion: 'La suma de 2 y 2 es 4.',
        opciones: { create: [
          { texto: '3', esCorrecta: false, orden: 0, explicacion: 'Revisa la suma.' },
          { texto: '4', esCorrecta: true, orden: 1, explicacion: 'Correcto: 2 + 2 = 4.' },
          { texto: '5', esCorrecta: false, orden: 2 },
        ] },
      },
    })
    const p2 = await prisma.pregunta.create({
      data: {
        cursoId: curso.id, autorId: profe.id, tipo: 'verdadero_falso', enunciado: 'El número 7 es primo.',
        puntaje: 1, tema: 'Teoría de números', explicacion: '7 solo es divisible por 1 y por sí mismo.',
        opciones: { create: [
          { texto: 'Verdadero', esCorrecta: true, orden: 0 },
          { texto: 'Falso', esCorrecta: false, orden: 1 },
        ] },
      },
    })
    const p3 = await prisma.pregunta.create({
      data: {
        cursoId: curso.id, autorId: profe.id, tipo: 'abierta', enunciado: 'Explica con tus palabras qué es un número primo.',
        puntaje: 2, tema: 'Teoría de números', respuestaModelo: 'Un número natural mayor que 1 divisible solo por 1 y por sí mismo.',
      },
    })

    // 4) Examen con práctica habilitada
    const ahora = new Date()
    const examen = await prisma.examen.create({
      data: {
        cursoId: curso.id, titulo: 'Examen diagnóstico', instrucciones: 'Responde con calma.',
        duracionMin: 30, fechaInicio: new Date(ahora.getTime() - 3600_000), fechaFin: new Date(ahora.getTime() + 7 * 24 * 3600_000),
        intentosMax: 2, aleatorizar: true, permitePractica: true, mostrarResultados: 'al_entregar', estado: 'publicado',
        examenPreguntas: { create: [
          { preguntaId: p1.id, orden: 0 },
          { preguntaId: p2.id, orden: 1 },
          { preguntaId: p3.id, orden: 2 },
        ] },
      },
    })
    console.log(`📝 Examen sembrado: ${examen.titulo} (id ${examen.id})`)
  }

  console.log(`✅ Seed completado. Admin: ${adminEmail} / ${adminPassword}`)
  console.log(`   Profesor: profesor@examenes.local / profesor1234`)
  console.log(`   Estudiantes: estudiante1@examenes.local, estudiante2@examenes.local / estudiante1234`)
}

main().catch((e) => { console.error('❌ Seed falló:', e); process.exit(1) }).finally(() => void prisma.$disconnect())
