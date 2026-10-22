import argon2 from 'argon2'

// Hashing de contraseñas con argon2id (Req 1.6).
export function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, { type: argon2.argon2id })
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try { return await argon2.verify(hash, plain) }
  catch { return false }
}
