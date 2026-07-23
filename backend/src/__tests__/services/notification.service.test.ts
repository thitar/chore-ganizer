import {
  sendNtfy,
  sendTestNotification,
  notifyChoreAssigned,
  notifyChoreDueSoon,
  notifyChoreCompleted,
  notifyParentsOfChoreCompletion,
} from '../../services/notification.service'

jest.mock('../../config/notifications', () => ({
  isNtfyConfigured: true,
  getNtfyConfig: jest.fn(() => ({ baseUrl: 'https://ntfy.example.com' })),
}))

jest.mock('../../config/prisma', () => ({
  prisma: {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}))

const { prisma } = require('../../config/prisma')

const mockAssignment = {
  id: 42,
  template: { title: 'Wash Dishes', points: 10 },
  assignedTo: { ntfyTopic: 'test-topic-123' },
  dueDate: new Date('2026-07-15T00:00:00Z'),
}

describe('notification.service', () => {
  beforeEach(() => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response())
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('sendNtfy', () => {
    it('calls fetch with correct URL and headers', async () => {
      await sendNtfy('test-topic', 'Test Title', 'Test body', { priority: 4, tags: ['warning'] })
      expect(global.fetch).toHaveBeenCalledWith(
        'https://ntfy.example.com/test-topic',
        expect.objectContaining({
          method: 'POST',
          body: 'Test body',
          headers: expect.objectContaining({
            Title: 'Test Title',
            Priority: '4',
            Tags: 'warning',
          }),
        })
      )
    })

    it('encodes topic in URL', async () => {
      await sendNtfy('test/topic', 'Title', 'body')
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('test%2Ftopic'),
        expect.anything()
      )
    })

    it('sets Priority header as string', async () => {
      await sendNtfy('topic', 'Title', 'body', { priority: 5 })
      const callArgs = (global.fetch as jest.Mock).mock.calls[0]
      expect(callArgs[1].headers.Priority).toBe('5')
    })

    it('joins tags array with comma for Tags header', async () => {
      await sendNtfy('topic', 'Title', 'body', { tags: ['tag1', 'tag2'] })
      const callArgs = (global.fetch as jest.Mock).mock.calls[0]
      expect(callArgs[1].headers.Tags).toBe('tag1,tag2')
    })

    it('omits Tags header when tags array is empty', async () => {
      await sendNtfy('topic', 'Title', 'body', { tags: [] })
      const callArgs = (global.fetch as jest.Mock).mock.calls[0]
      expect(callArgs[1].headers.Tags).toBeUndefined()
    })

    it('omits Click header when click is undefined', async () => {
      await sendNtfy('topic', 'Title', 'body')
      const callArgs = (global.fetch as jest.Mock).mock.calls[0]
      expect(callArgs[1].headers.Click).toBeUndefined()
    })

    it('sets Click header when provided', async () => {
      await sendNtfy('topic', 'Title', 'body', { click: '/chores/42' })
      const callArgs = (global.fetch as jest.Mock).mock.calls[0]
      expect(callArgs[1].headers.Click).toBe('/chores/42')
    })

    it('uses AbortController with 3000ms timeout', async () => {
      await sendNtfy('topic', 'Title', 'body')
      const callArgs = (global.fetch as jest.Mock).mock.calls[0]
      expect(callArgs[1].signal).toBeDefined()
    })
  })

  describe('sendNtfy - unconfigured', () => {
    beforeEach(() => {
      jest.resetModules()
      jest.mock('../../config/notifications', () => ({
        isNtfyConfigured: false,
        getNtfyConfig: jest.fn(() => ({ baseUrl: '' })),
      }))
    })

    it('does not call fetch when config is disabled', async () => {
      const { sendNtfy: sendNtfyDisabled } = require('../../services/notification.service')
      await sendNtfyDisabled('topic', 'Title', 'body')
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('does not call fetch when topic is null', async () => {
      await sendNtfy(null, 'Title', 'body')
      expect(global.fetch).not.toHaveBeenCalled()
    })
  })

  describe('sendNtfy - error handling', () => {
    it('does not throw on fetch rejection', async () => {
      jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'))
      await expect(sendNtfy('topic', 'Title', 'body')).resolves.not.toThrow()
    })

    it('logs warning on fetch rejection', async () => {
      jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'))
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()
      await sendNtfy('topic', 'Title', 'body')
      expect(consoleWarnSpy).toHaveBeenCalledWith('[ntfy] send failed for topic topic: Network error')
      consoleWarnSpy.mockRestore()
    })

    it('returns false when the server responds with a non-2xx status', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 401, statusText: 'Unauthorized' }))
      const result = await sendNtfy('topic', 'Title', 'body')
      expect(result).toBe(false)
    })

    it('logs a warning when the server responds with a non-2xx status', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 401, statusText: 'Unauthorized' }))
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()
      await sendNtfy('topic', 'Title', 'body')
      expect(consoleWarnSpy).toHaveBeenCalledWith('[ntfy] send failed for topic topic: server responded 401 Unauthorized')
      consoleWarnSpy.mockRestore()
    })
  })

  describe('notifyChoreAssigned', () => {
    it('calls sendNtfy with correct topic from assignment', () => {
      notifyChoreAssigned(mockAssignment)
      expect(global.fetch).toHaveBeenCalled()
    })

    it('does not call sendNtfy when topic is null', () => {
      notifyChoreAssigned({ ...mockAssignment, assignedTo: { ntfyTopic: null } })
      expect(global.fetch).not.toHaveBeenCalled()
    })
  })

  describe('notifyChoreDueSoon', () => {
    it('calls sendNtfy with correct topic', () => {
      notifyChoreDueSoon(mockAssignment)
      expect(global.fetch).toHaveBeenCalled()
    })

    it('does not call sendNtfy when topic is null', () => {
      notifyChoreDueSoon({ ...mockAssignment, assignedTo: { ntfyTopic: null } })
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('returns false when topic is null', async () => {
      const result = await notifyChoreDueSoon({ ...mockAssignment, assignedTo: { ntfyTopic: null } })
      expect(result).toBe(false)
    })
  })

  describe('notifyChoreCompleted', () => {
    it('calls sendNtfy twice with 2 parents both having topics', () => {
      const parents = [{ ntfyTopic: 'parent1' }, { ntfyTopic: 'parent2' }]
      notifyChoreCompleted(mockAssignment, parents)
      expect(global.fetch).toHaveBeenCalledTimes(2)
    })

    it('calls sendNtfy once with 1 parent having topic, 1 null', () => {
      const parents = [{ ntfyTopic: 'parent1' }, { ntfyTopic: null }]
      notifyChoreCompleted(mockAssignment, parents)
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('does not call sendNtfy with empty parents array', () => {
      notifyChoreCompleted(mockAssignment, [])
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('does not call sendNtfy with all parents null topics', () => {
      const parents = [{ ntfyTopic: null }, { ntfyTopic: null }]
      notifyChoreCompleted(mockAssignment, parents)
      expect(global.fetch).not.toHaveBeenCalled()
    })
  })

  describe('sendTestNotification', () => {
    beforeEach(() => {
      prisma.user.findUnique.mockReset()
    })

    it('sends a test notification to the configured topic and returns the delivery result', async () => {
      prisma.user.findUnique.mockResolvedValue({ ntfyTopic: 'my-topic' })
      const result = await sendTestNotification(1)
      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 1 }, select: { ntfyTopic: true } })
      expect(global.fetch).toHaveBeenCalledWith('https://ntfy.example.com/my-topic', expect.anything())
      expect(result).toBe(true)
    })

    it('throws when the user has no ntfy topic set', async () => {
      prisma.user.findUnique.mockResolvedValue({ ntfyTopic: null })
      await expect(sendTestNotification(1)).rejects.toThrow('No ntfy topic is set for this user')
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('throws when the user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null)
      await expect(sendTestNotification(999)).rejects.toThrow('No ntfy topic is set for this user')
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('propagates the false result when ntfy rejects the send', async () => {
      prisma.user.findUnique.mockResolvedValue({ ntfyTopic: 'my-topic' })
      jest.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 401, statusText: 'Unauthorized' }))
      const result = await sendTestNotification(1)
      expect(result).toBe(false)
    })
  })

  describe('sendTestNotification - unconfigured', () => {
    beforeEach(() => {
      jest.resetModules()
      jest.mock('../../config/notifications', () => ({
        isNtfyConfigured: false,
        getNtfyConfig: jest.fn(() => ({ baseUrl: '' })),
      }))
    })

    it('throws before looking up the user when ntfy is not configured', async () => {
      const { sendTestNotification: sendTestNotificationDisabled } = require('../../services/notification.service')
      await expect(sendTestNotificationDisabled(1)).rejects.toThrow('Notifications are not configured on this server')
      expect(prisma.user.findUnique).not.toHaveBeenCalled()
    })
  })

  describe('notifyParentsOfChoreCompletion', () => {
    beforeEach(() => {
      prisma.user.findMany.mockReset()
    })

    it('looks up PARENT users and notifies them', async () => {
      prisma.user.findMany.mockResolvedValue([{ ntfyTopic: 'parent1' }, { ntfyTopic: 'parent2' }])
      await notifyParentsOfChoreCompletion(mockAssignment)
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { role: 'PARENT' },
        select: { ntfyTopic: true },
      })
      expect(global.fetch).toHaveBeenCalledTimes(2)
    })

    it('does not throw when the parent lookup fails, and logs a warning instead', async () => {
      prisma.user.findMany.mockRejectedValue(new Error('DB connection lost'))
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()
      await expect(notifyParentsOfChoreCompletion(mockAssignment)).resolves.not.toThrow()
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('DB connection lost')
      )
      expect(global.fetch).not.toHaveBeenCalled()
      consoleWarnSpy.mockRestore()
    })
  })
})
