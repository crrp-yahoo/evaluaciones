// Serializa BigInt como string para que Express pueda devolverlo en JSON.
// Se aplica globalmente en app.ts mediante app.set('json replacer', ...).
export function bigintReplacer(_key: string, value: unknown): unknown {
  return typeof value === 'bigint' ? value.toString() : value
}
