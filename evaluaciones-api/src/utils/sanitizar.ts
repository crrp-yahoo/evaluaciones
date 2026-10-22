import sanitizeHtml from 'sanitize-html'

// Sanitiza HTML de enunciados y explicaciones (Req 11.1). Permite formato básico,
// elimina scripts/estilos/atributos peligrosos.
const OPCIONES: sanitizeHtml.IOptions = {
  allowedTags: ['b', 'i', 'em', 'strong', 'u', 'p', 'br', 'ul', 'ol', 'li', 'code', 'pre', 'sub', 'sup', 'span'],
  allowedAttributes: {},
  disallowedTagsMode: 'discard',
}

export function sanitizar(html: string | null | undefined): string | null {
  if (html == null) return null
  const limpio = sanitizeHtml(html, OPCIONES).trim()
  return limpio.length ? limpio : null
}
