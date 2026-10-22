import { describe, it, expect } from 'vitest'
import { signAccessToken, verifyAccessToken, generateRefreshToken, hashRefreshToken } from '../src/modules/auth/jwt'
import { hashPassword, verifyPassword } from '../src/modules/auth/password'

describe('JWT access token', () => {
  it('firma y verifica un token con el payload', () => {
    const token = signAccessToken({ sub: '42', rol: 'profesor', email: 'p@x.com' })
    const payload = verifyAccessToken(token)
    expect(payload.sub).toBe('42')
    expect(payload.rol).toBe('profesor')
    expect(payload.email).toBe('p@x.com')
  })

  it('rechaza un token manipulado', () => {
    const token = signAccessToken({ sub: '1', rol: 'estudiante', email: 'e@x.com' })
    expect(() => verifyAccessToken(token + 'x')).toThrow()
  })
})

describe('refresh token', () => {
  it('genera token opaco, su hash SHA-256 y fecha de expiración futura', () => {
    const { token, tokenHash, expiraEn } = generateRefreshToken()
    expect(token).toHaveLength(96) // 48 bytes hex
    expect(tokenHash).toBe(hashRefreshToken(token))
    expect(tokenHash).toHaveLength(64)
    expect(expiraEn.getTime()).toBeGreaterThan(Date.now())
  })

  it('el hash es determinista y distinto del token', () => {
    const { token, tokenHash } = generateRefreshToken()
    expect(hashRefreshToken(token)).toBe(tokenHash)
    expect(tokenHash).not.toBe(token)
  })
})

describe('password (argon2)', () => {
  it('hashea y verifica correctamente', async () => {
    const hash = await hashPassword('secreto-123')
    expect(hash).toMatch(/^\$argon2/)
    expect(await verifyPassword(hash, 'secreto-123')).toBe(true)
    expect(await verifyPassword(hash, 'otra')).toBe(false)
  })
})
