import axios from 'axios'
import { applyCsrfInterceptor } from './csrf'

// Single entry point for building an API module's axios instance. Each
// api/*.ts file must go through this (not axios.create() directly) so the
// CSRF interceptor — which does not propagate across separate instances —
// can't be forgotten on a new module.
export function createApiClient(baseURL: string) {
  return applyCsrfInterceptor(axios.create({ baseURL, withCredentials: true }))
}
