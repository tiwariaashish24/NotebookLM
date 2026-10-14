export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081"
).replace(/\/$/, "");

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function apiRequest<T>(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const requestUrl = path.startsWith("/api/auth/") ? path : `${API_URL}${path}`;
  const response = await fetch(requestUrl, {
    ...options,
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = (await response.json()) as { error?: string; message?: string };
      message = body.message ?? body.error ?? message;
    } catch {
      // Keep the status-based message when the response has no JSON body.
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function beginGoogleSignIn() {
  const response = await fetch("/api/auth/sign-in/social", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      provider: "google",
      callbackURL: window.location.origin,
    }),
  });

  if (!response.ok) {
    let message = `Google sign-in failed (${response.status}). Check the auth server logs.`;
    try {
      const body = (await response.json()) as { message?: string; error?: string };
      message = body.message ?? body.error ?? message;
    } catch {
      if (response.status >= 500) {
        message = "Google sign-in reached the auth server, but it could not complete the request. Check that Postgres is running and the server schema is initialized.";
      }
    }
    throw new ApiError(message, response.status);
  }

  const result = (await response.json()) as { url?: string; redirect?: boolean };
  if (!result.url) throw new Error("The auth server did not return a sign-in URL.");
  window.location.assign(result.url);
}
