/**
 * Version information for Chore-Ganizer Frontend
 * 
 * Semantic Versioning (MAJOR.MINOR.PATCH):
 * - MAJOR: Breaking changes, major features, architecture changes
 * - MINOR: New features, significant enhancements (backward compatible)
 * - PATCH: Bug fixes, small improvements
 * 
 * Version is read from runtime config (window.APP_CONFIG) or build-time env
 * Runtime config takes precedence (allows updates without rebuild)
 */

// Declare window.APP_CONFIG type
declare global {
  interface Window {
    APP_CONFIG?: {
      apiUrl?: string;
      debug?: boolean;
      appVersion?: string;
    };
  }
}

// Get version from runtime config (production) or build-time env (development)
export const VERSION = window.APP_CONFIG?.appVersion || import.meta.env.VITE_APP_VERSION || '1.5.0';
export const BUILD_DATE = '2026-02-19';
export const FULL_VERSION = `${VERSION}+${BUILD_DATE.replace(/-/g, '')}`;
