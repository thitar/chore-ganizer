/**
 * Version information for Chore-Ganizer API
 * 
 * Semantic Versioning (MAJOR.MINOR.PATCH):
 * - MAJOR: Breaking changes, major features, architecture changes
 * - MINOR: New features, significant enhancements (backward compatible)
 * - PATCH: Bug fixes, small improvements
 * 
 * Priority: APP_VERSION env var > baked .image-version > package.json
 */

export function getVersion(): string {
  if (process.env.APP_VERSION) return process.env.APP_VERSION;
  try {
    const content = require('fs').readFileSync('/app/.image-version', 'utf8');
    const parts = content.split('=');
    if (parts.length < 2) throw new Error('Malformed .image-version');
    return parts[1].trim();
  } catch {
    // Fallback during local development
    return require('../package.json').version;
  }
}

export const VERSION = getVersion();
export const BUILD_DATE = new Date().toISOString().split('T')[0];
export const FULL_VERSION = `${VERSION}+${BUILD_DATE.replace(/-/g, '')}`;
