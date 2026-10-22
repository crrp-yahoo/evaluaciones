// Error de dominio con código estable y estado HTTP. El errorHandler lo mapea
// al formato { error: { codigo, mensaje, detalles? } }.
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly codigo: string,
    mensaje: string,
    public readonly detalles?: unknown,
  ) {
    super(mensaje)
    this.name = 'AppError'
  }
}

// Fábricas por tabla de "Manejo de errores" del diseño.
export const authInvalida = () => new AppError(401, 'AUTH_INVALIDA', 'Credenciales inválidas')
export const tokenInvalido = (m = 'Token inválido o ausente') => new AppError(401, 'TOKEN_INVALIDO', m)
export const prohibido = (m = 'No tienes permiso para esta acción') => new AppError(403, 'PROHIBIDO', m)
export const modoExamenSinFeedback = () => new AppError(403, 'MODO_EXAMEN_SIN_FEEDBACK', 'La retroalimentación no está disponible en modo examen')
export const noEncontrado = (m = 'Recurso no encontrado') => new AppError(404, 'NO_ENCONTRADO', m)
export const intentoNoPermitido = (m = 'Intento no permitido') => new AppError(409, 'INTENTO_NO_PERMITIDO', m)
export const tiempoAgotado = (m = 'El tiempo del intento ha finalizado') => new AppError(409, 'TIEMPO_AGOTADO', m)
export const validacion = (detalles?: unknown) => new AppError(422, 'VALIDACION', 'Error de validación', detalles)
export const rateLimit = () => new AppError(429, 'RATE_LIMIT', 'Demasiadas solicitudes, inténtalo más tarde')
