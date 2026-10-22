// ─────────────────────────────────────────────────────────────────────────────
// Utilidades puras del ExamRunner, aisladas para poder probarlas (tarea 19.5):
// formato del temporizador y cola local de respuestas para reconexión (Req 6.8).
// ─────────────────────────────────────────────────────────────────────────────

export const colaKey = (intentoId: string) => `intento:${intentoId}:respuestas`

/** Formatea segundos restantes como mm:ss (no negativo). */
export function formatearTiempo(segundos: number | null): string {
  if (segundos == null) return '--:--'
  const s = Math.max(0, segundos)
  const mm = String(Math.floor(s / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

export type MapaRespuestas = Record<string, string[]>

/** Guarda la cola de respuestas pendientes en localStorage. */
export function guardarCola(intentoId: string, respuestas: MapaRespuestas): void {
  localStorage.setItem(colaKey(intentoId), JSON.stringify(respuestas))
}

/** Lee la cola local (vacía si no hay o está corrupta). */
export function leerCola(intentoId: string): MapaRespuestas {
  try {
    return JSON.parse(localStorage.getItem(colaKey(intentoId)) ?? '{}') as MapaRespuestas
  } catch {
    return {}
  }
}

/** Borra la cola tras confirmar el guardado en el servidor. */
export function limpiarCola(intentoId: string): void {
  localStorage.removeItem(colaKey(intentoId))
}

/** Fusiona la respuesta del servidor con la cola local (la local tiene prioridad). */
export function fusionarRespuestas(servidor: MapaRespuestas, local: MapaRespuestas): MapaRespuestas {
  return { ...servidor, ...local }
}
