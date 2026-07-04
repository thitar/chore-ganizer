import { render, screen } from '@testing-library/react'
import { Button } from '../components/ui/Button'
import { Avatar } from '../components/ui/Avatar'
import { Toast } from '../components/ui/Toast'

describe('Button', () => {
  it('renders children and is disabled while loading', () => {
    render(<Button loading>Save</Button>)
    const btn = screen.getByRole('button', { name: /save/i })
    expect(btn).toBeDisabled()
  })
})

describe('Avatar', () => {
  it('renders up to two initials from the name', () => {
    render(<Avatar name="Alice Smith" color="#FF0000" />)
    expect(screen.getByText('AS')).toBeInTheDocument()
  })
  it('uses the given color as background', () => {
    render(<Avatar name="Bob" color="#00FF00" />)
    expect(screen.getByText('B')).toHaveStyle({ backgroundColor: '#00FF00' })
  })
})

describe('Toast', () => {
  it('exposes a status role', () => {
    render(<Toast kind="success">Done!</Toast>)
    expect(screen.getByRole('status')).toHaveTextContent('Done!')
  })
})
