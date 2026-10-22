// ─────────────────────────────────────────────────────────────────────────────
// Cliente HTTP. El access token vive EN MEMORIA (no en localStorage) y el refresh
// va por cookie httpOnly. Ante un 401, intenta /auth/refresh una vez y reintenta.
// ─────────────────────────────────────────────────────────────────────────────

let accessToken: string | null = null
export function setAccessToken(t: string | null) { accessToken = t }
export function getAccessToken() { return accessToken }

export interface ApiError { status: number; codigo: string; mensaje: string; detalles?: unknown }

async function parse(res: Response) {
  const ct = res.headers.get('content-type') ?? ''
  if (ct.includes('application/json')) return res.json()
  return res.text()
}

let refreshPromise: Promise<boolean> | null = null
async function intentarRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch('/api/v1/auth/refresh', { method: 'POST', credentials: 'include' })
      .then(async (r) => {
        if (!r.ok) return false
        const data = await r.json()
        accessToken = data.accessToken
        return true
      })
      .catch(() => false)
      .finally(() => { refreshPromise = null })
  }
  return refreshPromise
}

export async function api<T = unknown>(method: string, path: string, body?: unknown, _reintento = false): Promise<T> {
  const headers: Record<string, string> = {}
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const res = await fetch(`/api/v1${path}`, {
    method, headers, credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401 && !_reintento && path !== '/auth/refresh' && path !== '/auth/login') {
    if (await intentarRefresh()) return api<T>(method, path, body, true)
  }

  const data = await parse(res)
  if (!res.ok) {
    const e = (data as { error?: { codigo?: string; mensaje?: string; detalles?: unknown } }).error
    throw { status: res.status, codigo: e?.codigo ?? 'ERROR', mensaje: e?.mensaje ?? 'Error', detalles: e?.detalles } as ApiError
  }
  return data as T
}

export const http = {
  get: <T>(p: string) => api<T>('GET', p),
  post: <T>(p: string, b?: unknown) => api<T>('POST', p, b),
  put: <T>(p: string, b?: unknown) => api<T>('PUT', p, b),
  patch: <T>(p: string, b?: unknown) => api<T>('PATCH', p, b),
  del: <T>(p: string) => api<T>('DELETE', p),
}
