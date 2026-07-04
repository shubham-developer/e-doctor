export interface ApiResult<T> {
  success: boolean;
  data: T;
  error?: string;
}

async function request<T>(
  url: string,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  const res = await fetch(url, init);
  if (
    res.status === 401 &&
    typeof window !== "undefined" &&
    !url.includes("/auth/login")
  ) {
    const loginPath = url.startsWith("/api/admin") ? "/admin/login" : "/login";
    window.location.href = `${loginPath}?expired=1`;
    return { success: false, data: null as T, error: "Session expired" };
  }
  const text = await res.text();
  try {
    return JSON.parse(text) as ApiResult<T>;
  } catch {
    return {
      success: false,
      data: null as T,
      error: `Server error (${res.status})`,
    };
  }
}

function withJsonBody(method: string, body?: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  };
}

export const apiClient = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body?: unknown) =>
    request<T>(url, withJsonBody("POST", body)),
  put: <T>(url: string, body?: unknown) =>
    request<T>(url, withJsonBody("PUT", body)),
  patch: <T>(url: string, body?: unknown) =>
    request<T>(url, withJsonBody("PATCH", body)),
  delete: <T>(url: string) => request<T>(url, { method: "DELETE" }),
};
