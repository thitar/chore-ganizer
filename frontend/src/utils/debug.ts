/**
 * Shared debug utility for conditional console logging.
 *
 * In development (import.meta.env.DEV), all debug calls output to the browser console.
 * In production, debug calls are NO-OP — Vite replaces import.meta.env.DEV with false
 * at build time, and tree-shaking removes the `if (false)` branches.
 *
 * To enable debug output in production builds, set VITE_DEBUG=true in the build environment.
 */

const isDebugEnabled: boolean = import.meta.env.DEV || import.meta.env.VITE_DEBUG === 'true'

/**
 * Conditional console.log — gated on DEV mode or VITE_DEBUG.
 * Usage: debugLog('[Tag]', 'message', data)
 */
export function debugLog(...args: unknown[]): void {
  if (isDebugEnabled) {
    console.log(...args)
  }
}

/**
 * Conditional console.error — gated on DEV mode or VITE_DEBUG.
 * Usage: debugError('[Tag]', 'error:', err)
 */
export function debugError(...args: unknown[]): void {
  if (isDebugEnabled) {
    console.error(...args)
  }
}

/**
 * Conditional console.warn — gated on DEV mode or VITE_DEBUG.
 * Usage: debugWarn('[Tag]', 'warning message')
 */
export function debugWarn(...args: unknown[]): void {
  if (isDebugEnabled) {
    console.warn(...args)
  }
}
