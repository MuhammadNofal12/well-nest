import type { ErrorRequestHandler, RequestHandler } from 'express'
import { HttpError } from '../errors.js'

export const notFound: RequestHandler = (_request, response) => {
  response.status(404).json({ error: { code: 'not_found', message: 'Route not found.' } })
}

export const errorHandler: ErrorRequestHandler = (error, request, response, next) => {
  if (response.headersSent) {
    next(error)
    return
  }

  const status = error instanceof HttpError ? error.status : 500
  const code = error instanceof HttpError ? error.code : 'internal_error'
  const message = error instanceof HttpError ? error.message : 'An unexpected error occurred.'
  request.log?.error({ err: error, status }, 'Request failed')
  response.status(status).json({ error: { code, message } })
}
