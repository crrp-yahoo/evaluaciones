import { z } from 'zod'

// Esquemas Zod por tipo de pregunta (Req 4.1, 4.2).
const opcionSchema = z.object({
  texto: z.string().min(1),
  esCorrecta: z.boolean().default(false),
  explicacion: z.string().optional(),
  orden: z.number().int().min(0).default(0),
})

const base = {
  cursoId: z.coerce.bigint(),
  enunciado: z.string().min(1),
  puntaje: z.number().positive().default(1),
  explicacion: z.string().optional(),
  tema: z.string().optional(),
}

// Unión discriminada por tipo. Las opciones son ZodObject "puros" (sin refine)
// para que la discriminación funcione; las reglas de negocio se validan aparte.
const union = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('opcion_multiple'), ...base, opciones: z.array(opcionSchema).min(2) }),
  z.object({ tipo: z.literal('seleccion_multiple'), ...base, opciones: z.array(opcionSchema).min(2) }),
  z.object({ tipo: z.literal('verdadero_falso'), ...base, opciones: z.array(opcionSchema).length(2) }),
  z.object({ tipo: z.literal('abierta'), ...base, respuestaModelo: z.string().optional() }),
])

// Validaciones de negocio sobre cantidad de correctas según el tipo.
function validarCorrectas(data: z.infer<typeof union>, ctx: z.RefinementCtx) {
  if (data.tipo === 'opcion_multiple' || data.tipo === 'verdadero_falso') {
    const correctas = data.opciones.filter((o) => o.esCorrecta).length
    if (correctas !== 1) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['opciones'], message: 'Debe haber exactamente una opción correcta' })
  }
  if (data.tipo === 'seleccion_multiple') {
    if (!data.opciones.some((o) => o.esCorrecta)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['opciones'], message: 'Debe haber al menos una opción correcta' })
  }
}

export const crearPreguntaSchema = union.superRefine(validarCorrectas)
export const actualizarPreguntaSchema = union.superRefine(validarCorrectas)

export const filtroPreguntasSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  cursoId: z.coerce.bigint().optional(),
  tema: z.string().optional(),
  tipo: z.enum(['opcion_multiple', 'seleccion_multiple', 'verdadero_falso', 'abierta']).optional(),
  q: z.string().optional(),
})

export type CrearPregunta = z.infer<typeof crearPreguntaSchema>
