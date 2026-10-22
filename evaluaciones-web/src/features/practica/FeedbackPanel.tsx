import type { FeedbackPractica } from '../../api/tipos'

// Panel de retroalimentación de práctica (Req 7.3-7.5). Accesible: `aria-live` y
// no depende solo del color (incluye texto e íconos ✓/✗).
export function FeedbackPanel({ fb }: { fb: FeedbackPractica }) {
  const correcta = fb.correcta === true
  const abierta = fb.correcta === null
  return (
    <div aria-live="polite" className={`mt-3 rounded-xl p-4 border ${abierta ? 'bg-slate-50 border-slate-200' : correcta ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
      <div className="font-medium mb-1">{abierta ? 'Respuesta modelo' : correcta ? '✓ ¡Correcto!' : '✗ Incorrecto'}</div>
      {!abierta && fb.respuestaCorrecta && (
        <p className="text-sm">Respuesta correcta: <strong>{fb.respuestaCorrecta.map((r) => r.texto).join(', ')}</strong></p>
      )}
      {abierta && fb.respuestaModelo && <p className="text-sm">{fb.respuestaModelo}</p>}
      {fb.explicacion && <p className="text-sm mt-1 text-slate-700">{fb.explicacion}</p>}
      {fb.explicacionOpcion && <p className="text-sm mt-1 text-slate-600">Sobre tu respuesta: {fb.explicacionOpcion}</p>}
    </div>
  )
}
