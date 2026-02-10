import axios, { AxiosInstance, AxiosError } from 'axios'
import type { ApiResponse, ApiError } from '../types'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

class ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: `${API_URL}/api`,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ApiError>) => {
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
