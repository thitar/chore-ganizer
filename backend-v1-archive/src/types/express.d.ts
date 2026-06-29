import { Request } from 'express'

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number
        email: string
        name: string
        role: 'PARENT' | 'CHILD'
        points: number
        color: string | null
      }
    }
  }
}

export {}
