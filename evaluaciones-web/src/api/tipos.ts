// Tipos compartidos con el backend (en español).
export type Rol = 'admin' | 'profesor' | 'estudiante'

export interface Usuario { id: string; nombre: string; email: string; rol: Rol; activo?: boolean }

export interface Curso { id: string; nombre: string; profesorId: string }

export type TipoPregunta = 'opcion_multiple' | 'seleccion_multiple' | 'verdadero_falso' | 'abierta'

export interface OpcionPregunta { id?: string; texto: string; esCorrecta: boolean; explicacion?: string | null; orden: number }
export interface Pregunta {
  id: string; cursoId: string; tipo: TipoPregunta; enunciado: string; puntaje: number
  explicacion: string | null; respuestaModelo: string | null; tema: string | null; version: number
  opciones: OpcionPregunta[]
}

export type MostrarResultados = 'nunca' | 'al_entregar' | 'al_cerrar_examen'
export interface Examen {
  id: string; cursoId: string; titulo: string; instrucciones: string | null
  duracionMin: number; fechaInicio: string; fechaFin: string; intentosMax: number
  aleatorizar: boolean; permitePractica: boolean; mostrarResultados: MostrarResultados
  estado: 'borrador' | 'publicado' | 'cerrado'; preguntas: number; curso?: string
}

export interface PreguntaIntento { id: string; tipo: TipoPregunta; enunciado: string; puntaje: number; opciones: Array<{ id: string; texto: string; orden: number }> }
export interface VistaIntento {
  id: string; examenId: string; modo: 'examen' | 'practica'; estado: string
  inicio: string; finLimite: string | null; tiempoRestanteSeg: number | null
  preguntas: PreguntaIntento[]
  respuestas: Array<{ preguntaId: string; opcionesElegidas: string[]; texto: string | null }>
}

export interface FeedbackPractica {
  correcta: boolean | null
  respuestaCorrecta?: Array<{ id: string; texto: string }>
  respuestaModelo?: string | null
  explicacion: string | null
  explicacionOpcion?: string | null
}

export interface Paginado<T> { rows: T[]; total: number; page: number; pageSize: number; totalPages: number }
