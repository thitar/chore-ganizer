import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios'
import type { ApiResponse, ApiError } from '../types'

// Use VITE_API_URL if set, otherwise use empty string for relative URLs (proxied by nginx)
const API_URL = import.meta.env.VITE_API_URL || ''

// Enable debug logging in development OR when VITE_DEBUG is set to 'true'
const isDev = import.meta.env.DEV
const debugEnabled = isDev || import.meta.env.VITE_DEBUG === 'true'

if (debugEnabled) {
  console.log('[ApiClient] Initializing with API_URL:', API_URL || '(empty - using relative URLs)')
  console.log('[ApiClient] Debug mode enabled')
}

interface CsrfTokenResponse {
  csrfToken: string
}

class ApiClient {
  private client: AxiosInstance
  private csrfToken: string | null = null
  private csrfInitialized: boolean = false
  private csrfPromise: Promise<void> | null = null

  constructor() {
    const baseURL = API_URL ? `${API_URL}/api` : '/api'
    
    if (debugEnabled) {
      console.log('[ApiClient] baseURL:', baseURL)
    }
    
    this.client = axios.create({
      baseURL,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })

    // Request interceptor for logging and CSRF token
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        if (debugEnabled) {
          console.log('[ApiClient] Request:', config.method?.toUpperCase(), config.url, config.data)
        }
        
        // Add CSRF token to state-changing requests
        const method = config.method?.toUpperCase()
        if (this.csrfToken && method && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
          config.headers['X-CSRF-Token'] = this.csrfToken
          if (debugEnabled) {
            console.log('[ApiClient] Added CSRF token to request')
          }
        }
        
        return config
      },
      (error) => {
        if (debugEnabled) {
          console.error('[ApiClient] Request error:', error)
        }
        return Promise.reject(error)
      }
    )

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        if (debugEnabled) {
          console.log('[ApiClient] Response:', response.status, response.data)
        }
        return response
      },
      async (error: AxiosError<ApiError>) => {
        if (debugEnabled) {
          console.error('[ApiClient] Response error:', error.message, error.response?.status, error.response?.data)
        }
        
        // Handle CSRF token errors - try to refresh token and retry
        if (error.response?.status === 403) {
          const errorData = error.response.data as any
          if (errorData?.error?.code === 'CSRF_TOKEN_INVALID' || errorData?.error?.code === 'CSRF_TOKEN_MISSING') {
            if (debugEnabled) {
              console.log('[ApiClient] CSRF token error, refreshing token...')
            }
            // Reset and re-fetch CSRF token
            this.csrfToken = null
            this.csrfInitialized = false
            await this.initCsrfToken()
            
            // Retry the original request once
            const originalRequest = error.config
            if (originalRequest) {
              originalRequest.headers['X-CSRF-Token'] = this.csrfToken
              return this.client.request(originalRequest)
            }
          }
        }
        
        if (error.response) {
          // Server responded with error status
          throw error.response.data
        } else if (error.request) {
          // Request made but no response
          throw {
            success: false,
            error: {
              message: 'No response from server',
              code: 'NETWORK_ERROR',
            },
          }
        } else {
          // Error in request setup
          throw {
            success: false,
            error: {
              message: error.message || 'Request failed',
              code: 'REQUEST_ERROR',
            },
          }
        }
      }
    )
  }

  /**
   * Initialize CSRF token from the server
   * Should be called when the app starts
   */
  async initCsrfToken(): Promise<void> {
    // Prevent multiple simultaneous CSRF token requests
    if (this.csrfPromise) {
      return this.csrfPromise
    }
    
    if (this.csrfInitialized && this.csrfToken) {
      return
    }

    this.csrfPromise = (async () => {
      try {
        if (debugEnabled) {
          console.log('[ApiClient] Fetching CSRF token...')
        }
        const response = await this.client.get<ApiResponse<CsrfTokenResponse>>('/csrf-token')
        this.csrfToken = response.data.data.csrfToken
        this.csrfInitialized = true
        if (debugEnabled) {
          console.log('[ApiClient] CSRF token initialized')
        }
      } catch (error) {
        console.error('[ApiClient] Failed to fetch CSRF token:', error)
        // Don't throw - allow the app to continue, requests will fail with CSRF error
      } finally {
        this.csrfPromise = null
      }
    })()

    return this.csrfPromise
  }

  /**
   * Reset CSRF token (useful after login/logout)
   */
  resetCsrfToken(): void {
    this.csrfToken = null
    this.csrfInitialized = false
  }

  async get<T>(url: string, config?: any): Promise<ApiResponse<T>> {
    const response = await this.client.get<ApiResponse<T>>(url, config)
    return response.data
  }

  async post<T>(url: string, data?: any, config?: any): Promise<ApiResponse<T>> {
    const response = await this.client.post<ApiResponse<T>>(url, data, config)
    return response.data
  }

  async put<T>(url: string, data?: any, config?: any): Promise<ApiResponse<T>> {
    const response = await this.client.put<ApiResponse<T>>(url, data, config)
    return response.data
  }

  async delete<T>(url: string, config?: any): Promise<ApiResponse<T>> {
    const response = await this.client.delete<ApiResponse<T>>(url, config)
    return response.data
  }

  async patch<T>(url: string, data?: any, config?: any): Promise<ApiResponse<T>> {
    const response = await this.client.patch<ApiResponse<T>>(url, data, config)
    return response.data
  }
}

export const apiClient = new ApiClient()
export default apiClient
