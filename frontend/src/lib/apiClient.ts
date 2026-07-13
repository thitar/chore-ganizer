import axios from 'axios'
import { applyCsrfInterceptor } from './csrf'

declare global {
  interface Window {
    APP_CONFIG?: { apiUrl?: string; debug?: boolean; appVersion?: string }
  }
}

// Single entry point for building an API module's axios instance. Each
// api/*.ts file must go through this (not axios.create() directly) so the
// CSRF interceptor — which does not propagate across separate instances —
// can't be forgotten on a new module.
//
// `path` is always a same-origin-relative path (e.g. '/api/assignments').
// window.APP_CONFIG.apiUrl (from config.js, see index.html) is prepended so
// a cross-origin deployment (frontend and backend on different hosts) can
// set VITE_API_URL and have every module pick it up automatically; it's
// empty by default, which preserves today's same-origin nginx-proxy setup.
export function createApiClient(path: string) {
  const apiUrl = window.APP_CONFIG?.apiUrl ?? ''
  return applyCsrfInterceptor(axios.create({ baseURL: apiUrl + path, withCredentials: true }))
}
