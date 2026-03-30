/**
 * Ntfy Service Tests
 * 
 * Unit tests for the ntfy push notification service.
 */

import axios from 'axios'
import { sendNtfyNotification } from '../../services/ntfy.service'

// Mock axios
jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('Ntfy Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('sendNtfyNotification', () => {
    const baseOptions = {
      serverUrl: 'https://ntfy.sh',
      topic: 'test-topic',
      title: 'Test Notification',
      message: 'This is a test message',
    }

    it('should send notification successfully with minimal options', async () => {
      mockedAxios.post.mockResolvedValue({ status: 200 })

      const result = await sendNtfyNotification(baseOptions)

      expect(result).toBe(true)
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://ntfy.sh/test-topic',
        baseOptions.message,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Title': baseOptions.title,
            'Priority': '3',
            'Tags': '',
          }),
          timeout: 10000,
        })
      )
    })

    it('should send notification with custom priority', async () => {
      mockedAxios.post.mockResolvedValue({ status: 200 })

      await sendNtfyNotification({
        ...baseOptions,
        priority: 5,
      })

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://ntfy.sh/test-topic',
        baseOptions.message,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Priority': '5',
          }),
        })
      )
    })

    it('should send notification with tags', async () => {
      mockedAxios.post.mockResolvedValue({ status: 200 })

      await sendNtfyNotification({
        ...baseOptions,
        tags: ['warning', 'bell'],
      })

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://ntfy.sh/test-topic',
        baseOptions.message,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Tags': 'warning,bell',
          }),
        })
      )
    })

    it('should send notification with click URL', async () => {
      mockedAxios.post.mockResolvedValue({ status: 200 })

      await sendNtfyNotification({
        ...baseOptions,
        clickUrl: 'https://example.com/click',
      })

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://ntfy.sh/test-topic',
        baseOptions.message,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Click': 'https://example.com/click',
          }),
        })
      )
    })

    it('should send notification with Basic Auth credentials', async () => {
      mockedAxios.post.mockResolvedValue({ status: 200 })

      await sendNtfyNotification({
        ...baseOptions,
        username: 'testuser',
        password: 'testpass',
      })

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://ntfy.sh/test-topic',
        baseOptions.message,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': expect.stringMatching(/^Basic /),
          }),
        })
      )
    })

    it('should return false when serverUrl is missing', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

      const result = await sendNtfyNotification({
        serverUrl: '',
        topic: 'test-topic',
        title: 'Test',
        message: 'Test message',
      } as any)

      expect(result).toBe(false)
      expect(mockedAxios.post).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should return false when topic is missing', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

      const result = await sendNtfyNotification({
        serverUrl: 'https://ntfy.sh',
        topic: '',
        title: 'Test',
        message: 'Test message',
      } as any)

      expect(result).toBe(false)
      expect(mockedAxios.post).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should return false when title is missing', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

      const result = await sendNtfyNotification({
        serverUrl: 'https://ntfy.sh',
        topic: 'test-topic',
        title: '',
        message: 'Test message',
      } as any)

      expect(result).toBe(false)
      expect(mockedAxios.post).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should return false when message is missing', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

      const result = await sendNtfyNotification({
        serverUrl: 'https://ntfy.sh',
        topic: 'test-topic',
        title: 'Test',
        message: '',
      } as any)

      expect(result).toBe(false)
      expect(mockedAxios.post).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should handle axios errors gracefully', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Network error'))

      const result = await sendNtfyNotification(baseOptions)

      expect(result).toBe(false)
    })

    it('should strip trailing slash from server URL', async () => {
      mockedAxios.post.mockResolvedValue({ status: 200 })

      await sendNtfyNotification({
        ...baseOptions,
        serverUrl: 'https://ntfy.sh/',
      })

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://ntfy.sh/test-topic',
        expect.any(String),
        expect.any(Object)
      )
    })

    it('should use default priority of 3 when not specified', async () => {
      mockedAxios.post.mockResolvedValue({ status: 200 })

      await sendNtfyNotification(baseOptions)

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://ntfy.sh/test-topic',
        baseOptions.message,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Priority': '3',
          }),
        })
      )
    })

    it('should use empty tags when not specified', async () => {
      mockedAxios.post.mockResolvedValue({ status: 200 })

      await sendNtfyNotification(baseOptions)

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://ntfy.sh/test-topic',
        baseOptions.message,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Tags': '',
          }),
        })
      )
    })
  })
})
