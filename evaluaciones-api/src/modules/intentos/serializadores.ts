// ─────────────────────────────────────────────────────────────────────────────
// Serializadores de preguntas (Req 6.4). DOS funciones distintas, nunca una
// condicional ad hoc, para garantizar que durante un intento en modo examen el
// cliente jamás reciba `esCorrecta` ni explicaciones.
// ─────────────────────────────────────────────────────────────────────────────

export interface OpcionDB {
  id: bigint
  texto: string
  esCorrecta: boolean
  explicacion: string | null
  orden: number
}

export interface PreguntaDB {
  id: bigint
  tipo: string
  enunciado: string
  puntaje: unknown
  explicacion: string | null
  respuestaModelo: string | null
  opciones: OpcionDB[]
}

/** Para presentar un intento: SIN es_correcta ni explicaciones. */
export interface PreguntaParaIntentoDTO {
  id: string
  tipo: string
  enunciado: string
  puntaje: number
  opciones: Array<{ id: string; texto: string; orden: number }>
}

export function aPreguntaParaIntento(p: PreguntaDB, ordenOpciones?: string[]): PreguntaParaIntentoDTO {
  let opciones = p.opciones.map((o) => ({ id: o.id.toString(), texto: o.texto, orden: o.orden }))
  if (ordenOpciones?.length) {
    const pos = new Map(ordenOpciones.map((id, i) => [id, i]))
    opciones = [...opciones].sort((a, b) => (pos.get(a.id) ?? 0) - (pos.get(b.id) ?? 0))
  } else {
    opciones.sort((a, b) => a.orden - b.orden)
  }
  return { id: p.id.toString(), tipo: p.tipo, enunciado: p.enunciado, puntaje: Number(p.puntaje), opciones }
}

/** Para retroalimentación (solo práctica o revisión permitida): CON es_correcta y explicaciones. */
export interface PreguntaConRetroalimentacionDTO extends PreguntaParaIntentoDTO {
  explicacion: string | null
  opciones: Array<{ id: string; texto: string; orden: number; esCorrecta: boolean; explicacion: string | null }>
  respuestaModelo: string | null
}

export function aPreguntaConRetroalimentacion(p: PreguntaDB): PreguntaConRetroalimentacionDTO {
  return {
    id: p.id.toString(), tipo: p.tipo, enunciado: p.enunciado, puntaje: Number(p.puntaje),
    explicacion: p.explicacion, respuestaModelo: p.respuestaModelo,
    opciones: [...p.opciones].sort((a, b) => a.orden - b.orden).map((o) => ({
      id: o.id.toString(), texto: o.texto, orden: o.orden, esCorrecta: o.esCorrecta, explicacion: o.explicacion,
    })),
  }
}
