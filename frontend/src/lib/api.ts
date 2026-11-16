import axios, { AxiosError } from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

export const api = axios.create({
  baseURL,
  withCredentials: true,
  withXSRFToken: true,
  headers: { Accept: "application/json" },
});

/** Root of the Laravel app (strip /api/v1) — used for /sanctum/csrf-cookie. */
const appRoot = baseURL.replace(/\/api\/v1\/?$/, "");

export async function initializeCsrf() {
  await axios.get(`${appRoot}/sanctum/csrf-cookie`, { withCredentials: true });
}

export type ValidationErrors = Record<string, string[]>;

/** Pull a human-readable message and field errors out of a Laravel error response. */
export function apiError(err: unknown): { message: string; errors: ValidationErrors } {
  const e = err as AxiosError<{ message?: string; errors?: ValidationErrors }>;
  const data = e?.response?.data;
  if (e?.response?.status === 419) return { message: "Your session expired. Refresh the page and try again.", errors: {} };
  if (e?.response?.status === 429) return { message: "Too many attempts. Wait a minute and try again.", errors: {} };
  return {
    message: data?.message ?? (e?.message || "Something went wrong."),
    errors: data?.errors ?? {},
  };
}
