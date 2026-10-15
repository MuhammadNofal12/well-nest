import type { Logger } from 'pino'

declare global {
  namespace Express {
    interface Request {
      authUser?: {
        id: string
        businessId: string
        email: string
        fullName: string
      }
      log: Logger
    }
  }
}

export {}
