import { passwordSchema } from './validation.schemas'

describe('Password Validation Schema', () => {
  describe('special character validation', () => {
    it('should accept password with + special character', () => {
      const password = 'MyPass+123'
      const result = passwordSchema.safeParse(password)
      expect(result.success).toBe(true)
    })

    it('should accept password with - special character', () => {
      const password = 'MyPass-123'
      const result = passwordSchema.safeParse(password)
      expect(result.success).toBe(true)
    })

    it('should accept password with _ special character', () => {
      const password = 'MyPass_123'
      const result = passwordSchema.safeParse(password)
      expect(result.success).toBe(true)
    })

    it('should accept password with = special character', () => {
      const password = 'MyPass=123'
      const result = passwordSchema.safeParse(password)
      expect(result.success).toBe(true)
    })

    it('should accept password with ! special character', () => {
      const password = 'MyPass!123'
      const result = passwordSchema.safeParse(password)
      expect(result.success).toBe(true)
    })

    it('should reject password without special character', () => {
      const password = 'MyPassword123'
      const result = passwordSchema.safeParse(password)
      expect(result.success).toBe(false)
    })
  })

  describe('other password requirements', () => {
    it('should require at least 8 characters', () => {
      const password = 'Short!1'
      const result = passwordSchema.safeParse(password)
      expect(result.success).toBe(false)
    })

    it('should require at least one uppercase letter', () => {
      const password = 'lowercase+123'
      const result = passwordSchema.safeParse(password)
      expect(result.success).toBe(false)
    })

    it('should require at least one lowercase letter', () => {
      const password = 'UPPERCASE+123'
      const result = passwordSchema.safeParse(password)
      expect(result.success).toBe(false)
    })

    it('should require at least one number', () => {
      const password = 'NoNumbers+Pass'
      const result = passwordSchema.safeParse(password)
      expect(result.success).toBe(false)
    })

    it('should accept valid password', () => {
      const password = 'ValidPass+123'
      const result = passwordSchema.safeParse(password)
      expect(result.success).toBe(true)
    })
  })
})
