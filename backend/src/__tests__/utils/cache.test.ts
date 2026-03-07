/**
 * Cache Utility Tests
 * 
 * Unit tests for the NodeCache wrapper utilities.
 */

import {
  getFromCache,
  setInCache,
  removeFromCache,
  flushCache,
  getCacheStats,
  CACHE_KEYS,
  CACHE_TTL,
} from '../../utils/cache'

// Mock NodeCache module
jest.mock('node-cache', () => {
  const store = new Map()
  
  return jest.fn().mockImplementation(() => ({
    get: jest.fn((key: string) => store.get(key)?.value),
    set: jest.fn((key: string, value: unknown, ttl?: number) => {
      store.set(key, { value, expires: ttl ? Date.now() + ttl * 1000 : null })
      return true
    }),
    del: jest.fn((key: string) => {
      const existed = store.has(key)
      store.delete(key)
      return existed ? 1 : 0
    }),
    flushAll: jest.fn(() => store.clear()),
    getStats: jest.fn(() => ({
      keys: store.size,
      hits: 0,
      misses: 0,
      ksize: 0,
      vsize: 0,
    })),
  }))
})

describe('Cache Utils', () => {
  beforeEach(() => {
    flushCache()
  })

  describe('CACHE_KEYS', () => {
    it('should have all expected cache keys defined', () => {
      expect(CACHE_KEYS.CHORE_TEMPLATES).toBe('chore_templates')
      expect(CACHE_KEYS.CATEGORIES).toBe('categories')
      expect(CACHE_KEYS.NOTIFICATION_SETTINGS).toBe('notification_settings')
      expect(CACHE_KEYS.USER_PREFERENCES).toBe('user_preferences')
    })
  })

  describe('CACHE_TTL', () => {
    it('should have all expected TTL values defined', () => {
      expect(CACHE_TTL.SHORT).toBe(300) // 5 minutes
      expect(CACHE_TTL.MEDIUM).toBe(600) // 10 minutes
      expect(CACHE_TTL.LONG).toBe(3600) // 1 hour
    })
  })

  describe('setInCache', () => {
    it('should store value in cache without TTL', () => {
      const result = setInCache('test_key', { foo: 'bar' })
      expect(result).toBe(true)
    })

    it('should store value in cache with custom TTL', () => {
      const result = setInCache('test_key', { foo: 'bar' }, 60)
      expect(result).toBe(true)
    })

    it('should store different types of values', () => {
      setInCache('string', 'test string')
      setInCache('number', 42)
      setInCache('boolean', true)
      setInCache('array', [1, 2, 3])
      setInCache('null', null)
      setInCache('undefined', undefined)

      expect(getFromCache('string')).toBe('test string')
      expect(getFromCache('number')).toBe(42)
      expect(getFromCache('boolean')).toBe(true)
      expect(getFromCache('array')).toEqual([1, 2, 3])
      expect(getFromCache('null')).toBe(null)
      expect(getFromCache('undefined')).toBe(undefined)
    })
  })

  describe('getFromCache', () => {
    it('should return undefined for non-existent key', () => {
      const result = getFromCache('non_existent')
      expect(result).toBeUndefined()
    })

    it('should return cached value for existing key', () => {
      const data = { id: 1, name: 'Test' }
      setInCache('existing_key', data)
      
      const result = getFromCache('existing_key')
      expect(result).toEqual(data)
    })

    it('should return correct type for cached primitives', () => {
      setInCache('string_val', 'hello')
      setInCache('number_val', 123)
      setInCache('bool_val', false)

      expect(getFromCache<string>('string_val')).toBe('hello')
      expect(getFromCache<number>('number_val')).toBe(123)
      expect(getFromCache<boolean>('bool_val')).toBe(false)
    })
  })

  describe('removeFromCache', () => {
    it('should return 0 for non-existent key', () => {
      const result = removeFromCache('non_existent')
      expect(result).toBe(0)
    })

    it('should return 1 and remove existing key', () => {
      setInCache('to_remove', { data: 'value' })
      
      const result = removeFromCache('to_remove')
      expect(result).toBe(1)
      expect(getFromCache('to_remove')).toBeUndefined()
    })

    it('should only remove the specified key', () => {
      setInCache('key1', 'value1')
      setInCache('key2', 'value2')
      setInCache('key3', 'value3')
      
      removeFromCache('key2')
      
      expect(getFromCache('key1')).toBe('value1')
      expect(getFromCache('key2')).toBeUndefined()
      expect(getFromCache('key3')).toBe('value3')
    })
  })

  describe('flushCache', () => {
    it('should clear all cached values', () => {
      setInCache('key1', 'value1')
      setInCache('key2', 'value2')
      setInCache('key3', 'value3')
      
      flushCache()
      
      expect(getFromCache('key1')).toBeUndefined()
      expect(getFromCache('key2')).toBeUndefined()
      expect(getFromCache('key3')).toBeUndefined()
    })
  })

  describe('getCacheStats', () => {
    it('should return cache statistics', () => {
      const stats = getCacheStats()
      
      expect(stats).toHaveProperty('keys')
      expect(stats).toHaveProperty('hits')
      expect(stats).toHaveProperty('misses')
      expect(stats).toHaveProperty('ksize')
      expect(stats).toHaveProperty('vsize')
    })

    it('should reflect cache changes in stats', () => {
      setInCache('stat_test_1', 'value1')
      setInCache('stat_test_2', 'value2')
      
      const stats = getCacheStats()
      expect(stats.keys).toBeGreaterThanOrEqual(2)
    })
  })
})
