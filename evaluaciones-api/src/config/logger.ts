import pino from 'pino'
import { env } from './env'

// Logger estructurado (Req 11.6). En desarrollo, salida legible.
export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : 'info',
  ...(env.NODE_ENV === 'development'
    ? { transport: { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } } }
    : {}),
})
