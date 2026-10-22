import { describe, it, expect } from 'vitest'
import { aPreguntaParaIntento, aPreguntaConRetroalimentacion, type PreguntaDB } from '../src/modules/intentos/serializadores'

const preguntaDB: PreguntaDB = {
  id: 10n, tipo: 'opcion_multiple', enunciado: '¿2+2?', puntaje: 1,
  explicacion: 'Es 4', respuestaModelo: null,
  opciones: [
    { id: 1n, texto: '3', esCorrecta: false, explicacion: 'no', orden: 1 },
    { id: 2n, texto: '4', esCorrecta: true, explicacion: 'sí', orden: 0 },
  ],
}

describe('PreguntaParaIntentoDTO (seguridad)', () => {
  it('NUNCA expone esCorrecta ni explicaciones', () => {
    const dto = aPreguntaParaIntento(preguntaDB)
    const json = JSON.stringify(dto)
    expect(json).not.toContain('esCorrecta')
    expect(json).not.toContain('explicacion')
    expect(json).not.toContain('respuestaModelo')
    // Las opciones solo llevan id, texto y orden.
    for (const o of dto.opciones) expect(Object.keys(o).sort()).toEqual(['id', 'orden', 'texto'])
  })
  it('ordena opciones por `orden` por defecto', () => {
    const dto = aPreguntaParaIntento(preguntaDB)
    expect(dto.opciones.map((o) => o.id)).toEqual(['2', '1'])
  })
  it('respeta un orden explícito (aleatorización)', () => {
    const dto = aPreguntaParaIntento(preguntaDB, ['1', '2'])
    expect(dto.opciones.map((o) => o.id)).toEqual(['1', '2'])
  })
})

describe('PreguntaConRetroalimentacionDTO', () => {
  it('sí incluye esCorrecta y explicaciones', () => {
    const dto = aPreguntaConRetroalimentacion(preguntaDB)
    expect(dto.explicacion).toBe('Es 4')
    expect(dto.opciones.find((o) => o.id === '2')?.esCorrecta).toBe(true)
  })
})
