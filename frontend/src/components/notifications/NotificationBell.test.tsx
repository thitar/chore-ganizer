import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '../../test/utils'
import { NotificationBell } from './NotificationBell'
import { mockNotification } from '../../test/utils'

describe('NotificationBell', () => {
  const mockOnMarkAsRead = vi.fn()
  const mockOnMarkAllAsRead = vi.fn()

  const defaultProps = {
    onMarkAsRead: mockOnMarkAsRead,
    onMarkAllAsRead: mockOnMarkAllAsRead,
  }

  beforeEach(() => {
    mockOnMarkAsRead.mockClear()
    mockOnMarkAllAsRead.mockClear()
  })

  it('renders bell icon', () => {
    render(<NotificationBell {...defaultProps} unreadCount={0} notifications={[]} />)
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
  })

  it('does not show badge when unreadCount is 0', () => {
    render(<NotificationBell {...defaultProps} unreadCount={0} notifications={[]} />)
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })

  it('shows badge with unread count', () => {
    render(<NotificationBell {...defaultProps} unreadCount={5} notifications={[]} />)
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('toggles dropdown when bell is clicked', () => {
    render(<NotificationBell {...defaultProps} unreadCount={0} notifications={[]} />)
    const button = screen.getByRole('button')
    
    // Initially closed
    expect(screen.queryByText('Notifications')).not.toBeInTheDocument()
    
    // Open dropdown
    fireEvent.click(button)
    expect(screen.getByText('Notifications')).toBeInTheDocument()
    
    // Close dropdown
    fireEvent.click(button)
    expect(screen.queryByText('Notifications')).not.toBeInTheDocument()
  })

  it('shows empty state when no notifications', () => {
    render(<NotificationBell {...defaultProps} unreadCount={0} notifications={[]} />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('No notifications')).toBeInTheDocument()
  })

  it('renders list of notifications', () => {
    const notifications = [
      mockNotification({ id: 1, title: 'First Notification' }),
      mockNotification({ id: 2, title: 'Second Notification' }),
    ]
    render(<NotificationBell {...defaultProps} unreadCount={2} notifications={notifications} />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('First Notification')).toBeInTheDocument()
    expect(screen.getByText('Second Notification')).toBeInTheDocument()
  })

  it('shows notification message', () => {
    const notifications = [
      mockNotification({ message: 'You have a new chore assigned' }),
    ]
    render(<NotificationBell {...defaultProps} unreadCount={1} notifications={notifications} />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('You have a new chore assigned')).toBeInTheDocument()
  })

  it('highlights unread notifications', () => {
    const notifications = [
      mockNotification({ id: 1, read: false }),
    ]
    const { container } = render(
      <NotificationBell {...defaultProps} unreadCount={1} notifications={notifications} />
    )
    fireEvent.click(screen.getByRole('button'))
    const notificationItem = container.querySelector('.bg-blue-50')
    expect(notificationItem).toBeInTheDocument()
  })

  it('shows unread indicator dot for unread notifications', () => {
    const notifications = [
      mockNotification({ id: 1, read: false }),
    ]
    const { container } = render(
      <NotificationBell {...defaultProps} unreadCount={1} notifications={notifications} />
    )
    fireEvent.click(screen.getByRole('button'))
    const unreadDot = container.querySelector('.w-2.h-2.bg-blue-600.rounded-full')
    expect(unreadDot).toBeInTheDocument()
  })

  it('does not show unread indicator for read notifications', () => {
    const notifications = [
      mockNotification({ id: 1, read: true }),
    ]
    const { container } = render(
      <NotificationBell {...defaultProps} unreadCount={0} notifications={notifications} />
    )
    fireEvent.click(screen.getByRole('button'))
    const unreadDot = container.querySelector('.w-2.h-2.bg-blue-600.rounded-full')
    expect(unreadDot).not.toBeInTheDocument()
  })

  it('calls onMarkAsRead when clicking unread notification', () => {
    const notifications = [
      mockNotification({ id: 1, read: false, title: 'Test Notification' }),
    ]
    render(<NotificationBell {...defaultProps} unreadCount={1} notifications={notifications} />)
    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByText('Test Notification'))
    expect(mockOnMarkAsRead).toHaveBeenCalledWith(1)
  })

  it('does not call onMarkAsRead when clicking read notification', () => {
    const notifications = [
      mockNotification({ id: 1, read: true, title: 'Test Notification' }),
    ]
    render(<NotificationBell {...defaultProps} unreadCount={0} notifications={notifications} />)
    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByText('Test Notification'))
    expect(mockOnMarkAsRead).not.toHaveBeenCalled()
  })

  it('shows Mark all as read button when there are unread notifications', () => {
    render(<NotificationBell {...defaultProps} unreadCount={3} notifications={[]} />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('Mark all as read')).toBeInTheDocument()
  })

  it('hides Mark all as read button when no unread notifications', () => {
    render(<NotificationBell {...defaultProps} unreadCount={0} notifications={[]} />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.queryByText('Mark all as read')).not.toBeInTheDocument()
  })

  it('calls onMarkAllAsRead when Mark all as read is clicked', () => {
    render(<NotificationBell {...defaultProps} unreadCount={3} notifications={[]} />)
    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByText('Mark all as read'))
    expect(mockOnMarkAllAsRead).toHaveBeenCalledTimes(1)
  })

  it('closes dropdown after Mark all as read is clicked', () => {
    render(<NotificationBell {...defaultProps} unreadCount={3} notifications={[]} />)
    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByText('Mark all as read'))
    expect(screen.queryByText('Notifications')).not.toBeInTheDocument()
  })
})
