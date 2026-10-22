import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FeedbackPanel } from './FeedbackPanel'

describe('FeedbackPanel', () => {
  it('respuesta correcta: muestra acierto, respuesta correcta y explicación', () => {
    render(<FeedbackPanel fb={{ correcta: true, respuestaCorrecta: [{ id: '2', texto: '4' }], explicacion: 'La suma es 4' }} />)
    expect(screen.getByText(/¡Correcto!/)).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('La suma es 4')).toBeInTheDocument()
  })

  it('respuesta incorrecta: muestra error y explicación de la opción elegida', () => {
    render(<FeedbackPanel fb={{ correcta: false, respuestaCorrecta: [{ id: '2', texto: '4' }], explicacion: null, explicacionOpcion: 'Revisa la suma' }} />)
    expect(screen.getByText(/Incorrecto/)).toBeInTheDocument()
    expect(screen.getByText(/Revisa la suma/)).toBeInTheDocument()
  })

  it('pregunta abierta: muestra respuesta modelo sin marcar correcto/incorrecto', () => {
    render(<FeedbackPanel fb={{ correcta: null, respuestaModelo: 'Un número primo...', explicacion: null }} />)
    expect(screen.getByText('Respuesta modelo')).toBeInTheDocument()
    expect(screen.getByText('Un número primo...')).toBeInTheDocument()
  })

  it('es accesible: usa aria-live para anunciar el resultado', () => {
    const { container } = render(<FeedbackPanel fb={{ correcta: true, respuestaCorrecta: [], explicacion: null }} />)
    expect(container.querySelector('[aria-live="polite"]')).not.toBeNull()
  })
})
