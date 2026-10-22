// Cálculo de la hora límite de un intento en modo examen (Req 6.1).
// fin_limite = MIN(inicio + duración, cierre de la ventana del examen).
export function calcularFinLimite(inicio: Date, duracionMin: number, fechaFinVentana: Date): Date {
  const porDuracion = new Date(inicio.getTime() + duracionMin * 60_000)
  return porDuracion < fechaFinVentana ? porDuracion : fechaFinVentana
}

// Segundos restantes según el reloj del servidor (nunca negativos).
export function tiempoRestanteSeg(finLimite: Date | null, ahora = new Date()): number | null {
  if (!finLimite) return null
  return Math.max(0, Math.floor((finLimite.getTime() - ahora.getTime()) / 1000))
}

// Tolerancia de gracia para autoguardado tardío (Req 6.6): 5 segundos.
export const GRACIA_MS = 5_000

export function dentroDeLimite(finLimite: Date | null, ahora = new Date()): boolean {
  if (!finLimite) return true // práctica sin límite
  return ahora.getTime() <= finLimite.getTime() + GRACIA_MS
}
