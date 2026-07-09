import { AxiosInstance, InternalAxiosRequestConfig } from 'axios'

function getCookie(name: string): string | undefined {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)'))
  return match ? decodeURIComponent(match[1]) : undefined
}

function attachCsrfToken(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  const method = config.method?.toUpperCase()
  if (method && method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    const token = getCookie('XSRF-TOKEN')
    if (token) {
      config.headers['x-xsrf-token'] = token
    }
  }
  return config
}

// axios.create() instances have their own interceptor chain, independent from
// the default axios export, so each API module's instance must register this.
export function applyCsrfInterceptor(instance: AxiosInstance): AxiosInstance {
  instance.interceptors.request.use(attachCsrfToken)
  return instance
}
