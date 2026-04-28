import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * Creates a mock AxiosInstance that simulates interceptor behavior.
 * When a method (get/post/put/delete/patch/request) rejects,
 * the registered response error interceptor is invoked just like real Axios.
 */
function createMockAxiosInstance() {
  let responseErrorHandler: Function | null = null

  const mocks: any = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
    request: vi.fn(),
  }

  const instance: any = {
    ...mocks,
    interceptors: {
      request: { use: vi.fn() },
      response: {
        use: vi.fn((_onFulfilled: any, onRejected: any) => {
          responseErrorHandler = onRejected
        }),
      },
    },
    // Expose raw mocks for test configuration
    _mocks: mocks,
  }

  // Safety guard to detect infinite retry loops in tests
  const originalRequest = mocks.request
  instance.request = async (...args: any[]) => {
    instance._requestCallCount = (instance._requestCallCount || 0) + 1
    if (instance._requestCallCount > 5) {
      throw new Error('Infinite loop detected: too many retries via request()')
    }
    try {
      return await originalRequest(...args)
    } catch (error) {
      if (responseErrorHandler) {
        try {
          return await responseErrorHandler(error)
        } catch (handledError) {
          throw handledError
        }
      }
      throw error
    }
  }

  const wrapMethod = (method: string) => {
    const originalFn = mocks[method]
    instance[method] = async (...args: any[]) => {
      try {
        return await originalFn(...args)
      } catch (error) {
        if (responseErrorHandler) {
          try {
            return await responseErrorHandler(error)
          } catch (handledError) {
            throw handledError
          }
        }
        throw error
      }
    }
  }

  ;['get', 'post', 'put', 'delete', 'patch'].forEach(wrapMethod)

  return instance
}

function createCsrfError(config: { url: string; method: string }) {
  return {
    response: {
      status: 403,
      data: {
        success: false,
        error: { code: 'CSRF_TOKEN_INVALID', message: 'Invalid CSRF token' },
      },
      config: { ...config, headers: {} },
    },
    config: { ...config, headers: {} },
    message: 'Request failed with status code 403',
  }
}

function createCsrfMissingError(config: { url: string; method: string }) {
  return {
    response: {
      status: 403,
      data: {
        success: false,
        error: { code: 'CSRF_TOKEN_MISSING', message: 'CSRF token missing' },
      },
      config: { ...config, headers: {} },
    },
    config: { ...config, headers: {} },
    message: 'Request failed with status code 403',
  }
}

function createForbiddenError(config: { url: string; method: string }) {
  return {
    response: {
      status: 403,
      data: {
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied' },
      },
      config: { ...config, headers: {} },
    },
    config: { ...config, headers: {} },
    message: 'Request failed with status code 403',
  }
}

describe('ApiClient CSRF retry behavior', () => {
  let client: any
  let mockInstance: ReturnType<typeof createMockAxiosInstance>

  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()

    mockInstance = createMockAxiosInstance()

    vi.doMock('axios', () => ({
      default: {
        create: vi.fn(() => mockInstance),
      },
    }))

    const clientModule = await import('./client')
    client = new clientModule.ApiClient()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.doUnmock('axios')
  })

  it('should retry request once on CSRF token invalid error', async () => {
    // First call fails with CSRF error; retry succeeds via request()
    mockInstance._mocks.post.mockRejectedValueOnce(
      createCsrfError({ url: '/chores', method: 'post' })
    )
    mockInstance._mocks.request.mockResolvedValueOnce({
      data: { success: true, data: { id: 1 } },
    })

    // CSRF token fetch succeeds
    mockInstance._mocks.get.mockResolvedValue({
      data: { success: true, data: { csrfToken: 'new-token' } },
    })

    const result = await client.post('/chores', { title: 'Test Chore' })

    expect(result.success).toBe(true)
    expect(mockInstance._mocks.post).toHaveBeenCalledTimes(1) // original request only
    expect(mockInstance._mocks.request).toHaveBeenCalledTimes(1) // one retry
  })

  it('should fail after one retry if CSRF error persists', async () => {
    // Both original and retry fail with CSRF error
    mockInstance._mocks.post
      .mockRejectedValueOnce(createCsrfError({ url: '/chores', method: 'post' }))

    mockInstance._mocks.request
      .mockRejectedValueOnce(createCsrfError({ url: '/chores', method: 'post' }))

    // CSRF token fetch succeeds
    mockInstance._mocks.get.mockResolvedValue({
      data: { success: true, data: { csrfToken: 'new-token' } },
    })

    await expect(client.post('/chores', { title: 'Test Chore' })).rejects.toBeDefined()

    // Original post + one retry request = 2 total user-facing calls
    expect(mockInstance._mocks.post).toHaveBeenCalledTimes(1)
    expect(mockInstance._mocks.request).toHaveBeenCalledTimes(1)
  })

  it('should allow unrelated requests to retry independently', async () => {
    // Request A: fails CSRF, retry succeeds
    // Request B: fails CSRF, retry succeeds
    mockInstance._mocks.post
      .mockRejectedValueOnce(createCsrfError({ url: '/chores', method: 'post' }))
      .mockRejectedValueOnce(createCsrfError({ url: '/users', method: 'post' }))
    mockInstance._mocks.request
      .mockResolvedValueOnce({ data: { success: true, data: { id: 1 } } })
      .mockResolvedValueOnce({ data: { success: true, data: { id: 2 } } })

    // CSRF token fetch succeeds for both
    mockInstance._mocks.get.mockResolvedValue({
      data: { success: true, data: { csrfToken: 'new-token' } },
    })

    const resultA = await client.post('/chores', { title: 'Chore A' })
    const resultB = await client.post('/users', { name: 'User B' })

    expect(resultA.success).toBe(true)
    expect(resultB.success).toBe(true)
    expect(mockInstance._mocks.post).toHaveBeenCalledTimes(2) // 2 original posts
    expect(mockInstance._mocks.request).toHaveBeenCalledTimes(2) // 2 retries
  })

  it('should not retry on non-CSRF 403 errors', async () => {
    mockInstance._mocks.post.mockRejectedValueOnce(
      createForbiddenError({ url: '/admin', method: 'post' })
    )

    await expect(client.post('/admin', { action: 'delete' })).rejects.toBeDefined()

    expect(mockInstance._mocks.post).toHaveBeenCalledTimes(1)
    expect(mockInstance._mocks.request).not.toHaveBeenCalled()
  })

  it('should retry on CSRF_TOKEN_MISSING code', async () => {
    mockInstance._mocks.post.mockRejectedValueOnce(
      createCsrfMissingError({ url: '/chores', method: 'post' })
    )
    mockInstance._mocks.request.mockResolvedValueOnce({
      data: { success: true, data: { id: 1 } },
    })

    mockInstance._mocks.get.mockResolvedValue({
      data: { success: true, data: { csrfToken: 'new-token' } },
    })

    const result = await client.post('/chores', { title: 'Test Chore' })

    expect(result.success).toBe(true)
    expect(mockInstance._mocks.post).toHaveBeenCalledTimes(1)
    expect(mockInstance._mocks.request).toHaveBeenCalledTimes(1)
  })
})
