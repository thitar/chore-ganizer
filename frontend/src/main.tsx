import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './hooks/useAuth'
import App from './App'
import './lib/csrf'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/700.css'
import '@fontsource/space-grotesk/500.css'
import '@fontsource/space-grotesk/700.css'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 5 * 60 * 1000,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
