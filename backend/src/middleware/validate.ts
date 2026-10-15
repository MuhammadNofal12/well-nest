import type { RequestHandler } from 'express'
import type { ZodTypeAny } from 'zod'
import { HttpError } from '../errors.js'

export function validateBody(schema: ZodTypeAny): RequestHandler {
  return (request, _response, next) => {
    const result = schema.safeParse(request.body)
    if (!result.success) {
      next(new HttpError(400, result.error.issues.map((issue) => issue.message).join('; '), 'validation_error'))
      return
    }
    request.body = result.data
    next()
  }
}
