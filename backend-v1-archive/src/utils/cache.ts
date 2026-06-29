import NodeCache from 'node-cache';

// Cache with 10-minute default TTL
const cache = new NodeCache({
  stdTTL: 600, // 10 minutes
  checkperiod: 120, // Check for expired keys every 2 minutes
  useClones: false, // Better performance
});

// Cache keys constants
export const CACHE_KEYS = {
  CHORE_TEMPLATES: 'chore_templates',
  CATEGORIES: 'categories',
  NOTIFICATION_SETTINGS: 'notification_settings',
  USER_PREFERENCES: 'user_preferences',
} as const;

// Cache TTL constants (in seconds)
export const CACHE_TTL = {
  SHORT: 300,   // 5 minutes
  MEDIUM: 600,  // 10 minutes
  LONG: 3600,   // 1 hour
} as const;

// Helper functions
export const getFromCache = <T>(key: string): T | undefined => {
  return cache.get<T>(key);
};

export const setInCache = <T>(key: string, value: T, ttl?: number): boolean => {
  if (ttl) {
    return cache.set(key, value, ttl);
  }
  return cache.set(key, value);
};

export const removeFromCache = (key: string): number => {
  return cache.del(key);
};

export const flushCache = (): void => {
  cache.flushAll();
};

export const getCacheStats = () => {
  return cache.getStats();
};

export default cache;
