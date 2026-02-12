import axios, { AxiosInstance, AxiosError } from 'axios'
import type { ApiResponse, ApiError } from '../types'

// Use VITE_API_URL if set, otherwise use empty string for relative URLs (proxied by nginx)
const API_URL = import.meta.env.VITE_API_URL || ''

console.log('[ApiClient] Initializing with API_URL:', API_URL || '(empty - using relative URLs)')

class ApiClient {
  private client: AxiosInstance

  constructor() {
    const baseURL = API_URL ? `${API_URL}/api` : '/api'
    console.log('[ApiClient] baseURL:', baseURL)
    
    this.client = axios.create({
      baseURL,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log('[ApiClient] Request:', config.method?.toUpperCase(), config.url, config.data)
        return config
      },
      (error) => {
        console.error('[ApiClient] Request error:', error)
        return Promise.reject(error)
      }
    )

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        console.log('[ApiClient] Response:', response.status, response.data)
        return response
      },
      (error: AxiosError<ApiError>) => {
        console.error('[ApiClient] Response error:', error.message, error.response?.status, error.response?.data)
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
}

export const apiClient = new ApiClient()
export default apiClient
