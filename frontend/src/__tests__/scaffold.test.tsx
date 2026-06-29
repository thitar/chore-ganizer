import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '../hooks/useAuth'
import { AuthError } from '../api/auth.api'
import App from '../App'

vi.mock('../api/auth.api', async () => {
  const actual = await vi.importActual<typeof import('../api/auth.api')>('../api/auth.api')
  return {
    ...actual,
    getCurrentUser: vi.fn().mockRejectedValue(new actual.AuthError('Not authenticated', 401)),
    login: vi.fn(),
    logout: vi.fn(),
  }
})

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {ui}
      </AuthProvider>
    </QueryClientProvider>
  )
}

describe('App shell', () => {
  it('renders without crashing', () => {
    const { container } = renderWithProviders(<App />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('redirects to login page when not authenticated', async () => {
    renderWithProviders(<App />)

    await waitFor(() => {
      expect(screen.getByText('Sign in to your account')).toBeInTheDocument()
    })
  })
})
