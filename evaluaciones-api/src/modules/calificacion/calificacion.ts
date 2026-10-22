// ─────────────────────────────────────────────────────────────────────────────
// Servicio de calificación (Req 8). Funciones PURAS: no tocan BD, para poder
// probarlas de forma exhaustiva. La nota final SIEMPRE se calcula en el servidor.
// ─────────────────────────────────────────────────────────────────────────────

export type TipoPregunta = 'opcion_multiple' | 'seleccion_multiple' | 'verdadero_falso' | 'abierta'
export type ReglaSeleccionMultiple = 'todo_o_nada' | 'proporcional'

export interface OpcionCalif {
  id: string
  esCorrecta: boolean
}

export interface PreguntaCalif {
  tipo: TipoPregunta
  puntaje: number
  opciones: OpcionCalif[]
  regla?: ReglaSeleccionMultiple // solo selección múltiple; por defecto todo_o_nada
}

export interface ResultadoCalif {
  esCorrecta: boolean | null       // null para abierta (requiere revisión manual)
  puntaje: number                  // puntaje obtenido (0..pregunta.puntaje)
  requiereRevision: boolean        // true para preguntas abiertas
}

/**
 * Califica una pregunta según el tipo y las opciones elegidas.
 * @param opcionesElegidas ids de opciones marcadas por el estudiante.
 */
export function calificarPregunta(pregunta: PreguntaCalif, opcionesElegidas: string[]): ResultadoCalif {
  const correctas = new Set(pregunta.opciones.filter((o) => o.esCorrecta).map((o) => o.id))
  const elegidas = new Set(opcionesElegidas)

  switch (pregunta.tipo) {
    case 'abierta':
      // No se califica automáticamente (Req 8.3).
      return { esCorrecta: null, puntaje: 0, requiereRevision: true }

    case 'opcion_multiple':
    case 'verdadero_falso': {
      // Exactamente una correcta: acierto si eligió solo esa.
      const ok = elegidas.size === 1 && [...elegidas].every((id) => correctas.has(id))
      return { esCorrecta: ok, puntaje: ok ? pregunta.puntaje : 0, requiereRevision: false }
    }

    case 'seleccion_multiple': {
      const regla = pregunta.regla ?? 'todo_o_nada'
      const totalCorrectas = correctas.size
      if (totalCorrectas === 0) return { esCorrecta: false, puntaje: 0, requiereRevision: false }

      if (regla === 'todo_o_nada') {
        const exacto = elegidas.size === correctas.size && [...elegidas].every((id) => correctas.has(id))
        return { esCorrecta: exacto, puntaje: exacto ? pregunta.puntaje : 0, requiereRevision: false }
      }

      // Proporcional: (aciertos − errores) / totalCorrectas, mínimo 0.
      let aciertos = 0, errores = 0
      for (const id of elegidas) {
        if (correctas.has(id)) aciertos++
        else errores++
      }
      const fraccion = Math.max(0, (aciertos - errores) / totalCorrectas)
      const puntaje = Math.round(fraccion * pregunta.puntaje * 100) / 100
      return { esCorrecta: fraccion === 1, puntaje, requiereRevision: false }
    }
  }
}
