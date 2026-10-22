// Prueba de carga (Req 11.3): 500 estudiantes iniciando y autoguardando en paralelo.
// Objetivo: p95 del endpoint de autoguardado < 500 ms.
//
// Uso:
//   1. Prepara datos: un examen publicado con preguntas y 500 estudiantes inscritos.
//   2. Ajusta BASE_URL y el mecanismo de login según tu entorno.
//   3. Ejecuta:  k6 run pruebas-carga/autoguardado.k6.js
//
// Nota: este script es una plantilla. La obtención de tokens por usuario debe
// adaptarse (p. ej. pre-generar tokens o usar un endpoint de login masivo de prueba).

import http from 'k6/http'
import { check, sleep } from 'k6'

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1'

export const options = {
  scenarios: {
    autoguardado: {
      executor: 'per-vu-iterations',
      vus: 500,            // 500 estudiantes simultáneos
      iterations: 10,      // cada uno autoguarda 10 veces
      maxDuration: '2m',
    },
  },
  thresholds: {
    // Requisito 11.3: p95 por debajo de 500 ms.
    'http_req_duration{endpoint:autoguardado}': ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
}

// setup(): aquí deberías iniciar un intento por VU y devolver sus ids/token.
// Como depende de los datos de tu entorno, se deja como punto de extensión.
export function setup() {
  return { /* ejemplo: { tokens: [...], intentoIds: [...] } */ }
}

export default function (data) {
  const vu = __VU
  const token = data.tokens ? data.tokens[vu % data.tokens.length] : __ENV.TOKEN
  const intentoId = data.intentoIds ? data.intentoIds[vu % data.intentoIds.length] : __ENV.INTENTO_ID
  if (!token || !intentoId) return // sin datos de setup, no hay nada que medir

  const res = http.put(
    `${BASE_URL}/intentos/${intentoId}/respuestas`,
    JSON.stringify({ respuestas: [{ preguntaId: Number(__ENV.PREGUNTA_ID || 1), opcionesElegidas: [] }] }),
    { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, tags: { endpoint: 'autoguardado' } },
  )
  check(res, { 'status 200': (r) => r.status === 200 })
  sleep(1)
}
