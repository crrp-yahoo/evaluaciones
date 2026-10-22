import { describe, it, expect } from 'vitest'
import { calificarPregunta, type PreguntaCalif } from '../src/modules/calificacion/calificacion'

const ops = (defs: Array<[string, boolean]>) => defs.map(([id, esCorrecta]) => ({ id, esCorrecta }))

describe('calificarPregunta — opción múltiple', () => {
  const p: PreguntaCalif = { tipo: 'opcion_multiple', puntaje: 2, opciones: ops([['a', false], ['b', true], ['c', false]]) }
  it('acierta con la opción correcta', () => {
    expect(calificarPregunta(p, ['b'])).toEqual({ esCorrecta: true, puntaje: 2, requiereRevision: false })
  })
  it('falla con opción incorrecta', () => {
    expect(calificarPregunta(p, ['a'])).toEqual({ esCorrecta: false, puntaje: 0, requiereRevision: false })
  })
  it('falla si marca más de una', () => {
    expect(calificarPregunta(p, ['a', 'b']).esCorrecta).toBe(false)
  })
  it('falla sin respuesta', () => {
    expect(calificarPregunta(p, []).esCorrecta).toBe(false)
  })
})

describe('calificarPregunta — verdadero/falso', () => {
  const p: PreguntaCalif = { tipo: 'verdadero_falso', puntaje: 1, opciones: ops([['v', true], ['f', false]]) }
  it('acierta verdadero', () => expect(calificarPregunta(p, ['v']).puntaje).toBe(1))
  it('falla con falso', () => expect(calificarPregunta(p, ['f']).esCorrecta).toBe(false))
})

describe('calificarPregunta — selección múltiple (todo o nada)', () => {
  const p: PreguntaCalif = { tipo: 'seleccion_multiple', puntaje: 3, regla: 'todo_o_nada', opciones: ops([['a', true], ['b', true], ['c', false]]) }
  it('acierta solo con el conjunto exacto', () => {
    expect(calificarPregunta(p, ['a', 'b'])).toEqual({ esCorrecta: true, puntaje: 3, requiereRevision: false })
  })
  it('falla si falta una correcta', () => {
    expect(calificarPregunta(p, ['a']).puntaje).toBe(0)
  })
  it('falla si incluye una incorrecta', () => {
    expect(calificarPregunta(p, ['a', 'b', 'c']).esCorrecta).toBe(false)
  })
})

describe('calificarPregunta — selección múltiple (proporcional)', () => {
  const p: PreguntaCalif = { tipo: 'seleccion_multiple', puntaje: 4, regla: 'proporcional', opciones: ops([['a', true], ['b', true], ['c', false], ['d', false]]) }
  it('2 aciertos, 0 errores → total', () => {
    expect(calificarPregunta(p, ['a', 'b'])).toEqual({ esCorrecta: true, puntaje: 4, requiereRevision: false })
  })
  it('1 acierto, 0 errores → mitad', () => {
    expect(calificarPregunta(p, ['a']).puntaje).toBe(2)
  })
  it('1 acierto, 1 error → (1-1)/2 = 0', () => {
    expect(calificarPregunta(p, ['a', 'c']).puntaje).toBe(0)
  })
  it('2 aciertos, 1 error → (2-1)/2 = 2', () => {
    expect(calificarPregunta(p, ['a', 'b', 'c']).puntaje).toBe(2)
  })
  it('nunca baja de 0', () => {
    expect(calificarPregunta(p, ['c', 'd']).puntaje).toBe(0)
  })
})

describe('calificarPregunta — abierta', () => {
  const p: PreguntaCalif = { tipo: 'abierta', puntaje: 5, opciones: [] }
  it('no se califica automáticamente; requiere revisión', () => {
    expect(calificarPregunta(p, [])).toEqual({ esCorrecta: null, puntaje: 0, requiereRevision: true })
  })
})
