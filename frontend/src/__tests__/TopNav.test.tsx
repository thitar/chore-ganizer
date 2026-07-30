import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { TopNav } from '../components/TopNav'
import { BottomTabBar } from '../components/BottomTabBar'

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../hooks/useGames', () => ({
  useGames: vi.fn(),
}))

import { useAuth } from '../hooks/useAuth'
import { useGames } from '../hooks/useGames'

const parent = { id: 1, email: 'dad@test.com', name: 'Dad', role: 'PARENT', color: '#3B82F6' }
const child = { id: 2, email: 'alice@test.com', name: 'Alice', role: 'CHILD', color: '#F59E0B' }

function renderNav(
  user: typeof parent,
  ui: React.ReactElement,
  games: { data?: { pong: { unlocked: boolean } }; isLoading?: boolean } = {}
) {
  ;(useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
    user,
    isLoading: false,
    error: null,
    login: vi.fn(),
    logout: vi.fn(),
  })
  ;(useGames as ReturnType<typeof vi.fn>).mockReturnValue(games)
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('TopNav', () => {
  it('shows Manage dropdown for parents with admin links', async () => {
    renderNav(parent, <TopNav />)
    await userEvent.click(screen.getByRole('button', { name: /manage/i }))
    expect(screen.getByRole('link', { name: /templates/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /users/i })).toBeInTheDocument()
  })

  it('hides Manage for children', () => {
    renderNav(child, <TopNav />)
    expect(screen.queryByRole('button', { name: /manage/i })).not.toBeInTheDocument()
  })

  it.each([child, parent])('shows Games for unlocked %s users', user => {
    renderNav(user, <TopNav />, { data: { pong: { unlocked: true } } })
    expect(screen.getByRole('link', { name: 'Games' })).toHaveAttribute('href', '/games')
  })

  it('hides Games for a locked child', () => {
    renderNav(child, <TopNav />, { data: { pong: { unlocked: false } } })
    expect(screen.queryByRole('link', { name: 'Games' })).not.toBeInTheDocument()
  })

  it('hides Games while its status is loading', () => {
    renderNav(child, <TopNav />, { isLoading: true })
    expect(screen.queryByRole('link', { name: 'Games' })).not.toBeInTheDocument()
  })

  it('closes the Manage dropdown on Escape and returns focus to the trigger', async () => {
    renderNav(parent, <TopNav />)
    const trigger = screen.getByRole('button', { name: /manage/i })
    await userEvent.click(trigger)
    expect(screen.getByRole('link', { name: /templates/i })).toBeInTheDocument()

    await userEvent.keyboard('{Escape}')

    expect(screen.queryByRole('link', { name: /templates/i })).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })
})

describe('BottomTabBar', () => {
  it('renders the five main tabs', () => {
    renderNav(child, <BottomTabBar />)
    for (const label of ['Home', 'Chores', 'Points', 'Calendar', 'Profile']) {
      expect(screen.getByRole('link', { name: new RegExp(label, 'i') })).toBeInTheDocument()
    }
  })

  it('renders the Games tab only when Pong is unlocked', () => {
    const { rerender } = renderNav(child, <BottomTabBar />, { data: { pong: { unlocked: true } } })
    expect(screen.getByRole('link', { name: 'Games' })).toHaveAttribute('href', '/games')

    ;(useGames as ReturnType<typeof vi.fn>).mockReturnValue({ data: { pong: { unlocked: false } } })
    rerender(
      <MemoryRouter>
        <BottomTabBar />
      </MemoryRouter>
    )

    expect(screen.queryByRole('link', { name: 'Games' })).not.toBeInTheDocument()
  })
})
