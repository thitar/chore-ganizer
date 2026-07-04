jest.mock('../../config/notifications', () => ({
  isNtfyConfigured: true,
  getNtfyConfig: () => ({ baseUrl: 'https://ntfy.example.com' }),
}))

const { sendNtfy, notifyChoreDueSoon } = require('../../services/notification.service')

describe('sendNtfy', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
  })

  it('sends a POST request to ntfy with correct headers', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(new Response())
    await sendNtfy('test-topic', 'Title', 'body', { priority: 4, tags: ['tag1'], click: '/link' })
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://ntfy.example.com/test-topic',
      expect.objectContaining({
        method: 'POST',
        body: 'body',
        headers: expect.objectContaining({
          Title: 'Title',
          Priority: '4',
          Tags: 'tag1',
          Click: '/link',
        }),
      })
    )
    fetchSpy.mockRestore()
  })

  it('sends a POST request with minimal headers when opts are empty', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(new Response())
    await sendNtfy('test-topic', 'Minimal', 'body')
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://ntfy.example.com/test-topic',
      expect.objectContaining({
        headers: expect.objectContaining({
          Title: 'Minimal',
          Priority: '3',
        }),
      })
    )
    expect(fetchSpy.mock.calls[0][1].headers.Tags).toBeUndefined()
    expect(fetchSpy.mock.calls[0][1].headers.Click).toBeUndefined()
    fetchSpy.mockRestore()
  })

  it('does not fetch when topic is null', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(new Response())
    await sendNtfy(null, 'Title', 'body')
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })

  it('handles fetch errors gracefully', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'))
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    await sendNtfy('test-topic', 'Title', 'body')
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[ntfy] send failed'))
    fetchSpy.mockRestore()
    warnSpy.mockRestore()
  })
})

describe('sendNtfy - return value', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
  })

  it('returns true when fetch succeeds', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response())
    const result = await sendNtfy('test-topic', 'Title', 'body')
    expect(result).toBe(true)
  })

  it('returns false when fetch throws', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'))
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    const result = await sendNtfy('test-topic', 'Title', 'body')
    expect(result).toBe(false)
  })

  it('returns false when topic is null', async () => {
    const result = await sendNtfy(null, 'Title', 'body')
    expect(result).toBe(false)
  })
})

describe('notifyChoreDueSoon', () => {
  const mockAssignment = {
    id: 1,
    template: { title: 'Wash Dishes', points: 10 },
    assignedTo: { ntfyTopic: 'alice-topic' },
    dueDate: new Date('2026-07-02T00:00:00Z'),
  }

  beforeEach(() => {
    jest.restoreAllMocks()
  })

  it('calls sendNtfy and returns true when topic is set', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(new Response())
    const result = await notifyChoreDueSoon(mockAssignment)
    expect(result).toBe(true)
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://ntfy.example.com/alice-topic',
      expect.objectContaining({
        method: 'POST',
        body: 'Wash Dishes — 10 pts, due today',
        headers: expect.objectContaining({
          Title: 'Chore-Ganizer',
          Priority: '4',
          Tags: 'warning,alarm_clock',
          Click: '/chores/1',
        }),
      })
    )
    fetchSpy.mockRestore()
  })

  it('returns false when topic is null', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(new Response())
    const result = await notifyChoreDueSoon({ ...mockAssignment, assignedTo: { ntfyTopic: null } })
    expect(result).toBe(false)
    expect(global.fetch).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })
})
