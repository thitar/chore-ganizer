/**
 * Version information for Chore-Ganizer Frontend
 * 
 * Semantic Versioning (MAJOR.MINOR.PATCH):
 * - MAJOR: Breaking changes, major features, architecture changes
 * - MINOR: New features, significant enhancements (backward compatible)
 * - PATCH: Bug fixes, small improvements
 * 
 * Version is read from VITE_APP_VERSION environment variable (single source of truth)
 */

export const VERSION = import.meta.env.VITE_APP_VERSION || '1.1.1';
export const BUILD_DATE = '2026-02-16';
export const FULL_VERSION = `${VERSION}+${BUILD_DATE.replace(/-/g, '')}`;
