import jwt from 'jsonwebtoken'
import { createHash, randomBytes } from 'node:crypto'
import { env } from '../../config/env'
import type { Rol } from '@prisma/client'

// ─────────────────────────────────────────────────────────────────────────────
// Access token JWT de corta duración (Req 1.1) + refresh token aleatorio opaco
// que se guarda HASHEADO (SHA-256) y se rota en cada uso (Req 1.3).
// ─────────────────────────────────────────────────────────────────────────────

export interface AccessPayload {
  sub: string        // id del usuario (string por BigInt)
  rol: Rol
  email: string
}

export function signAccessToken(payload: AccessPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: `${env.ACCESS_TOKEN_TTL_MIN}m` })
}

export function verifyAccessToken(token: string): AccessPayload {
  return jwt.verify(token, env.JWT_SECRET) as AccessPayload
}

/** Genera un refresh token opaco y su hash para almacenar. */
export function generateRefreshToken(): { token: string; tokenHash: string; expiraEn: Date } {
  const token = randomBytes(48).toString('hex')
  const tokenHash = hashRefreshToken(token)
  const expiraEn = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000)
  return { token, tokenHash, expiraEn }
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
