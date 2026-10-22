// Aleatorización reproducible por semilla (Req 10.1). Mismo seed → mismo orden,
// para poder reconstruir el orden que vio el estudiante sin persistir cada lista.

// PRNG determinista (mulberry32).
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Baraja una copia del arreglo de forma determinista según la semilla. */
export function barajarConSemilla<T>(items: T[], seed: number): T[] {
  const rng = mulberry32(seed)
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j]!, arr[i]!]
  }
  return arr
}

/** Genera una semilla entera para un intento. */
export function nuevaSemilla(): number {
  return Math.floor(Math.random() * 2_147_483_647)
}
