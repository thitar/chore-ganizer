/**
 * Version information for Chore-Ganizer API
 * 
 * Semantic Versioning (MAJOR.MINOR.PATCH):
 * - MAJOR: Breaking changes, major features, architecture changes
 * - MINOR: New features, significant enhancements (backward compatible)
 * - PATCH: Bug fixes, small improvements
 * 
 * Version is read from APP_VERSION environment variable (single source of truth)
 */

export const VERSION = process.env.APP_VERSION || '1.8.0';
export const BUILD_DATE = new Date().toISOString().split('T')[0];
export const FULL_VERSION = `${VERSION}+${BUILD_DATE.replace(/-/g, '')}`;
