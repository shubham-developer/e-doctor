export interface ApiResult<T> {
  success: boolean
  data: T
  error?: string
}

async function request<T>(url: string, init?: RequestInit): Promise<ApiResult<T>> {
  const res = await fetch(url, init)
  return res.json()
}

function withJsonBody(method: string, body?: unknown): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }
}

export const apiClient = {
  get:   <T>(url: string) => request<T>(url),
  post:  <T>(url: string, body?: unknown) => request<T>(url, withJsonBody('POST', body)),
  put:   <T>(url: string, body?: unknown) => request<T>(url, withJsonBody('PUT', body)),
  patch: <T>(url: string, body?: unknown) => request<T>(url, withJsonBody('PATCH', body)),
  delete: <T>(url: string) => request<T>(url, { method: 'DELETE' }),
}
