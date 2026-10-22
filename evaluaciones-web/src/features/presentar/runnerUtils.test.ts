import { describe, it, expect, beforeEach } from 'vitest'
import { formatearTiempo, guardarCola, leerCola, limpiarCola, fusionarRespuestas, colaKey } from './runnerUtils'

describe('formatearTiempo (temporizador)', () => {
  it('formatea minutos y segundos con padding', () => {
    expect(formatearTiempo(1799)).toBe('29:59')
    expect(formatearTiempo(65)).toBe('01:05')
    expect(formatearTiempo(0)).toBe('00:00')
  })
  it('nunca muestra negativos', () => {
    expect(formatearTiempo(-10)).toBe('00:00')
  })
  it('muestra marcador cuando no hay tiempo (práctica)', () => {
    expect(formatearTiempo(null)).toBe('--:--')
  })
})

describe('cola local de reconexión', () => {
  beforeEach(() => localStorage.clear())

  it('guarda y lee respuestas de la cola', () => {
    guardarCola('42', { '1': ['a'], '2': ['b', 'c'] })
    expect(leerCola('42')).toEqual({ '1': ['a'], '2': ['b', 'c'] })
    expect(localStorage.getItem(colaKey('42'))).not.toBeNull()
  })
  it('devuelve objeto vacío si no hay cola', () => {
    expect(leerCola('99')).toEqual({})
  })
  it('devuelve vacío si la cola está corrupta', () => {
    localStorage.setItem(colaKey('7'), '{no-json')
    expect(leerCola('7')).toEqual({})
  })
  it('limpia la cola tras confirmar en el servidor', () => {
    guardarCola('42', { '1': ['a'] })
    limpiarCola('42')
    expect(localStorage.getItem(colaKey('42'))).toBeNull()
  })
  it('la respuesta local tiene prioridad sobre la del servidor', () => {
    const servidor = { '1': ['vieja'], '2': ['s2'] }
    const local = { '1': ['nueva'] }
    expect(fusionarRespuestas(servidor, local)).toEqual({ '1': ['nueva'], '2': ['s2'] })
  })
})
