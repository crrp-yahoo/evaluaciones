import { z } from 'zod'

const mostrar = z.enum(['nunca', 'al_entregar', 'al_cerrar_examen'])

export const crearExamenSchema = z.object({
  cursoId: z.coerce.bigint(),
  titulo: z.string().min(1),
  instrucciones: z.string().optional(),
  duracionMin: z.number().int().positive(),
  fechaInicio: z.coerce.date(),
  fechaFin: z.coerce.date(),
  intentosMax: z.number().int().min(1).default(1),
  aleatorizar: z.boolean().default(false),
  permitePractica: z.boolean().default(false),
  mostrarResultados: mostrar.default('al_entregar'),
}).refine((d) => d.fechaFin > d.fechaInicio, { message: 'fechaFin debe ser posterior a fechaInicio', path: ['fechaFin'] })

export const actualizarExamenSchema = z.object({
  titulo: z.string().min(1).optional(),
  instrucciones: z.string().optional(),
  duracionMin: z.number().int().positive().optional(),
  fechaInicio: z.coerce.date().optional(),
  fechaFin: z.coerce.date().optional(),
  intentosMax: z.number().int().min(1).optional(),
  aleatorizar: z.boolean().optional(),
  permitePractica: z.boolean().optional(),
  mostrarResultados: mostrar.optional(),
})

export const preguntasExamenSchema = z.object({
  preguntas: z.array(z.object({
    preguntaId: z.coerce.bigint(),
    orden: z.number().int().min(0),
    puntaje: z.number().positive().optional(),
  })).min(1),
})
