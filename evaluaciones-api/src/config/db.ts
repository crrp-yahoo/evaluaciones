import { PrismaClient } from '@prisma/client'

// Instancia única de Prisma. BigInt se serializa como string en las respuestas JSON
// (ver util en utils/json.ts) para no perder precisión.
export const prisma = new PrismaClient()
